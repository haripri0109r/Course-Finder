import Comment from '../models/Comment.js';
import { CompletedCourse } from '../models/index.js';
import Notification from '../models/Notification.js';
import { createNotification } from '../services/notificationService.js';
import { validateBody, addCommentSchema } from '../validators/schemas.js';

// ➕ Add Comment (Supports Threading)
export const addComment = async (req, res) => {
  const validation = validateBody(addCommentSchema, req.body);
  if (!validation.success) {
    return res.status(400).json({ message: "Validation failed", errors: validation.errors });
  }

  const { text, postId, parentId } = validation.data;

  // Enforce Max Depth (LinkedIn Style: 1 level deep)
  // FIX: Declare `parentComment` at function scope so it's available for notification logic
  let parentComment = null;

  if (parentId) {
    parentComment = await Comment.findById(parentId).lean();
    if (!parentComment) return res.status(400).json({ message: "Parent comment not found" });
    if (parentComment.parentId) {
      return res.status(400).json({ message: "Max depth reached (Only 1-level replies allowed)" });
    }
  }

  const completion = await CompletedCourse.findById(postId).populate('course', 'title').lean();
  if (!completion || completion.isRemoved) {
    return res.status(404).json({ message: 'Post not found or has been removed' });
  }

  const comment = await Comment.create({
    postId,
    userId: req.user._id,
    text: text.trim(),
    parentId: parentId || null,
  });

  // Atomically increment comment count
  await CompletedCourse.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } });

  // Activity Log
  trackEvent({
    userId: req.user._id,
    eventType: 'comment',
    targetId: postId,
    targetType: 'post'
  });

  const populated = await comment.populate('userId', 'name profilePicture');

  // 🔔 Trigger Notification
  try {
    const isReply = !!parentId;
    const actorId = req.user._id.toString();
    let recipientId;

    if (isReply && parentComment) {
      // FIX: Now correctly references `parentComment` (was `parent` — undefined)
      recipientId = parentComment.userId?.toString();
    } else {
      recipientId = completion.user?.toString();
    }

    // Prevent self-notification
    if (recipientId && recipientId !== actorId) {
      await createNotification({
        userId: recipientId,
        actorId: actorId,
        type: isReply ? 'reply' : 'comment',
        postId: postId,
        commentId: isReply ? parentId : undefined
      });
    }
  } catch (err) {
    console.error("Notification trigger failed:", err);
  }

  return res.status(201).json(populated);
};

// 📥 Get Threaded Comments (Root level with initial replies batch)
export const getComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const cursor = req.query.cursor;

    const query = { postId, parentId: null, isRemoved: false };
    if (cursor) {
      query._id = { $lt: cursor };
    }

    // 1. Fetch Root Comments (Cursor Paginated)
    const rootComments = await Comment.find(query)
      .sort({ _id: -1 })
      .limit(limit)
      .populate('userId', 'name profilePicture')
      .lean();

    const nextCursor = rootComments.length === limit ? rootComments[rootComments.length - 1]._id : null;

    // 2. Fetch total reply counts and the first few replies for each root (SCALABLE HYDRATION)
    const rootIds = rootComments.map(c => c._id);
    
    // Fetch initial 5 replies for each root comment using aggregation + lookup for user data (Single Query)
    const repliesAggregation = await Comment.aggregate([
      { $match: { parentId: { $in: rootIds }, isRemoved: false } },
      { $sort: { _id: -1 } },
      {
        $group: {
          _id: "$parentId",
          replies: { $push: "$$ROOT" },
          totalCount: { $sum: 1 }
        }
      },
      {
        $project: {
          totalCount: 1,
          topReplies: { $slice: ["$replies", 5] }
        }
      },
      // Hydrate user data for the sliced replies efficiently
      {
        $lookup: {
          from: 'users',
          localField: 'topReplies.userId',
          foreignField: '_id',
          as: 'replyUsers'
        }
      },
      {
        $project: {
          totalCount: 1,
          replies: {
            $map: {
              input: "$topReplies",
              as: "reply",
              in: {
                $mergeObjects: [
                  "$$reply",
                  {
                    userId: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$replyUsers",
                            as: "u",
                            cond: { $eq: ["$$u._id", "$$reply.userId"] }
                          }
                        },
                        0
                      ]
                    }
                  }
                ]
              }
            }
          }
        }
      },
      // Final projection to cleanup user fields (matching current populate('userId', 'name profilePicture') logic)
      {
        $project: {
          totalCount: 1,
          "replies.userId.name": 1,
          "replies.userId.profilePicture": 1,
          "replies.userId._id": 1,
          "replies._id": 1,
          "replies.postId": 1,
          "replies.text": 1,
          "replies.parentId": 1,
          "replies.likes": 1,
          "replies.likesCount": 1,
          "replies.createdAt": 1,
          "replies.updatedAt": 1
        }
      }
    ]);

    // Map aggregated results for easy lookup
    const countMap = {};
    const repliesMap = {};
    
    for (const group of repliesAggregation) {
      countMap[group._id.toString()] = group.totalCount;
      repliesMap[group._id.toString()] = group.replies;
    }

    // 3. Attach metadata and nested replies
    const formattedComments = rootComments.map(root => {
      const rootIdStr = root._id.toString();
      const nestedReplies = repliesMap[rootIdStr] || [];
      const totalCount = countMap[rootIdStr] || 0;
      
      return {
        ...root,
        replies: nestedReplies,
        replyCount: totalCount,
        hasReplies: totalCount > 0,
        hasMoreReplies: totalCount > 5
      };
    });

    return res.status(200).json({
      success: true,
      comments: formattedComments,
      nextCursor
    });
  } catch (error) {
    console.error("Get comments error:", error);
    return res.status(500).json({ success: false, message: 'Failed to fetch comments' });
  }
};

// 📥 Get Replies for a Comment (Cursor Paginated)
export const getReplies = async (req, res) => {
  try {
    const { commentId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 10, 30);
    const cursor = req.query.cursor;

    const query = { parentId: commentId, isRemoved: false };
    if (cursor) {
      query._id = { $lt: cursor };
    }

    const replies = await Comment.find(query)
      .sort({ _id: -1 })
      .limit(limit)
      .populate('userId', 'name profilePicture')
      .lean();

    const nextCursor = replies.length === limit ? replies[replies.length - 1]._id : null;

    return res.status(200).json({
      success: true,
      replies,
      nextCursor
    });
  } catch (error) {
    console.error("Get replies error:", error);
    return res.status(500).json({ success: false, message: 'Failed to fetch replies' });
  }
};

// ❤️ Toggle Like (Atomic Pipeline)
export const toggleLikeComment = async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  try {
    const updated = await Comment.findByIdAndUpdate(
      id,
      [
        {
          $set: {
            likes: {
              $cond: [
                { $in: [userId, "$likes"] },
                { $setDifference: ["$likes", [userId]] },
                { $concatArrays: ["$likes", [userId]] }
              ]
            }
          }
        },
        {
          $set: {
            likesCount: { $size: "$likes" }
          }
        }
      ],
      { new: true }
    ).populate('userId', 'name profilePicture');

    if (!updated) return res.status(404).json({ message: 'Comment not found' });

    const liked = updated.likes.map(id => id.toString()).includes(userId.toString());
    if (liked) {
      const commentLikeRecipient = (updated.userId._id || updated.userId).toString();
      const commentLikeActor = req.user._id.toString();

      if (commentLikeRecipient !== commentLikeActor) {
        await createNotification({
          userId: commentLikeRecipient,
          actorId: commentLikeActor,
          type: "comment_like",
          commentId: updated._id,
          postId: updated.postId,
        });
      }
    } else {
      const filter = {
        userId: updated.userId._id || updated.userId,
        actorId: req.user._id,
        type: 'comment_like',
        commentId: updated._id,
      };

      const removedNotif = await Notification.findOneAndUpdate(
        filter,
        { $set: { isRead: true } }
      );

      if (removedNotif && global.io) {
        global.io.to(filter.userId.toString()).emit("notification_removed", removedNotif._id);

        const count = await Notification.countDocuments({
          userId: filter.userId,
          isRead: false
        });
        global.io.to(filter.userId.toString()).emit("unread_count", count);
      }
    }

    return res.status(200).json(updated);
  } catch (err) {
    console.error("Toggle like error:", err);
    return res.status(500).json({ message: "Interaction failed" });
  }
};
