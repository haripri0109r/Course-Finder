import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

export const createNotification = async ({
  userId,
  actorId,
  type,
  postId,
  commentId
}) => {
  try {
    const notification = await Notification.create({
      userId,
      actorId,
      type,
      postId,
      commentId
    });

    const user = await User.findById(actorId).select("name");

    if (global.io) {
      global.io.to(userId.toString()).emit("new_notification", {
        _id: notification._id,
        actorName: user?.name || "Someone",
        postId: notification.postId,
        type: notification.type,
        createdAt: notification.createdAt
      });
    }
  } catch (err) {
    console.error("❌ Notification create error:", err.message);
  }
};

export const removeNotification = async ({ userId, actorId, type, postId, commentId }) => {
  try {
    const recipientStr = userId?.toString?.() || '';
    const actorStr = actorId?.toString?.() || '';

    if (!recipientStr || !actorStr) return;

    const safePostId = postId && mongoose.Types.ObjectId.isValid(postId)
      ? postId
      : undefined;

    const safeCommentId = commentId && mongoose.Types.ObjectId.isValid(commentId)
      ? commentId
      : undefined;

    const filter = {
      userId: recipientStr,
      actorId: actorStr,
      type,
      ...(safePostId && { postId: safePostId }),
      ...(safeCommentId && { commentId: safeCommentId }),
    };

    await Notification.deleteOne(filter);
    console.log(`🗑️ NOTIF REMOVED: type=${type} | actor=${actorStr} → recipient=${recipientStr}`);

    if (global.io && recipientStr) {
      const count = await Notification.countDocuments({
        userId: recipientStr,
        isRead: false
      });
      global.io.to(recipientStr).emit("unread_count", count);
    }
  } catch (err) {
    console.error("❌ Notification removal error:", err.message);
  }
};
