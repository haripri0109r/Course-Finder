import Comment from '../models/Comment.js';
import { CompletedCourse } from '../models/index.js';
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
    const recipientId = parentId ? (await Comment.findById(parentId)).userId : completion.user;
    
    await createNotification({
      recipientId,
      senderId: req.user._id,
      senderName: req.user.name,
      type: parentId ? 'reply' : 'comment',
      relatedPostId: postId,
      postTitle: completion.course?.title || 'Unknown Post',
    });
  } catch (err) {
    console.error("Notification failed:", err);
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

    // 🔔 Notification Logic
    const isLiked = updated.likes.includes(userId);
    if (isLiked) {
      await createNotification({
        recipientId: updated.userId._id || updated.userId,
        senderId: userId,
        senderName: req.user.name,
        type: 'comment_like',
        relatedCommentId: id,
        relatedPostId: updated.postId
      });
    } else {
      await removeNotification({
        recipientId: updated.userId._id || updated.userId,
        senderId: userId,
        type: 'comment_like',
        relatedCommentId: id
      });
    }

    return res.status(200).json(updated);
  } catch (err) {
    console.error("Toggle like error:", err);
    return res.status(500).json({ message: "Interaction failed" });
  }
};
