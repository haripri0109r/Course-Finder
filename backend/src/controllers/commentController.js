import Comment from '../models/Comment.js';
import { CompletedCourse } from '../models/index.js';
import Notification from '../models/Notification.js';
import { createNotification, removeNotification } from '../services/notificationService.js';

// ➕ Add Comment (Supports Threading)
export const addComment = async (req, res) => {
  const { text, postId, parentId } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ message: "Comment cannot be empty" });
  }

  // Enforce Max Depth (LinkedIn Style: 1 level deep)
  if (parentId) {
    const parent = await Comment.findById(parentId);
    if (!parent) return res.status(400).json({ message: "Parent comment not found" });
    if (parent.parentId) {
      return res.status(400).json({ message: "Max depth reached (Only 1-level replies allowed)" });
    }
  }

  const completion = await CompletedCourse.findById(postId).populate('course', 'title');
  if (!completion) {
    return res.status(404).json({ message: 'Post not found' });
  }

  const comment = await Comment.create({
    postId,
    userId: req.user._id,
    text,
    parentId: parentId || null,
  });

  const populated = await comment.populate('userId', 'name profilePicture');

  // 🔔 Trigger Notification
  try {
    const isReply = !!parentId;
    const recipientId = isReply ? (await Comment.findById(parentId)).userId : completion.user;

    await createNotification({
      userId: recipientId,
      actorId: req.user.id,
      type: isReply ? 'reply' : 'comment',
      postId: postId,
      commentId: isReply ? parentId : undefined
    });
  } catch (err) {
    console.error("Notification trigger failed:", err);
  }

  return res.status(201).json(populated);
};

// 📥 Get Threaded Comments (2-Pass Grouping)
export const getComments = async (req, res) => {
  const { postId } = req.params;

  const comments = await Comment.find({ postId })
    .sort({ createdAt: -1 })
    .populate('userId', 'name profilePicture')
    .lean();

  const map = {};
  const roots = [];

  // Pass 1: Map all comments
  comments.forEach(c => {
    map[c._id.toString()] = { ...c, replies: [] };
  });

  // Pass 2: Group by parent
  comments.forEach(c => {
    if (c.parentId) {
      if (map[c.parentId.toString()]) {
        map[c.parentId.toString()].replies.push(map[c._id.toString()]);
      }
    } else {
      roots.push(map[c._id.toString()]);
    }
  });

  // Sort replies chronologically (Descending)
  roots.forEach(c => {
    c.replies.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  });

  return res.status(200).json(roots);
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
      await createNotification({
        userId: updated.userId._id || updated.userId, // receiver
        actorId: req.user.id,                         // sender
        type: "comment_like",
        commentId: updated._id,
        postId: updated.postId,
      });
    } else {
      const filter = {
        userId: updated.userId._id || updated.userId,
        actorId: req.user.id,
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
