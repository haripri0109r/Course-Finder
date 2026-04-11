import mongoose from 'mongoose';
import Notification from '../models/Notification.js';

/**
 * Create notification with atomic upsert (prevents duplicates)
 */
export const createNotification = async ({
  userId,
  actorId,
  type,
  postId,
  commentId
}) => {
  if (!userId || !actorId) return;

  if (type !== 'follow' && !postId && !commentId) return;

  if (userId.toString() === actorId.toString()) return;

  const safePostId = postId && mongoose.Types.ObjectId.isValid(postId)
    ? postId
    : undefined;

  const safeCommentId = commentId && mongoose.Types.ObjectId.isValid(commentId)
    ? commentId
    : undefined;

  const filter = {
    userId,
    actorId,
    type,
    ...(safePostId && { postId: safePostId }),
    ...(safeCommentId && { commentId: safeCommentId }),
  };

  try {
    await Notification.findOneAndUpdate(
      filter,
      { ...filter, isRead: false },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.log("Notification upsert error:", err.message);
  }
};

/**
 * Remove notification (e.g. on unlike)
 */
export const removeNotification = async ({ userId, actorId, type, postId, commentId }) => {
  try {
    const safePostId = postId && mongoose.Types.ObjectId.isValid(postId)
      ? postId
      : undefined;

    const safeCommentId = commentId && mongoose.Types.ObjectId.isValid(commentId)
      ? commentId
      : undefined;

    const filter = {
      userId,
      actorId,
      type,
      ...(safePostId && { postId: safePostId }),
      ...(safeCommentId && { commentId: safeCommentId }),
    };

    await Notification.deleteOne(filter);
  } catch (err) {
    console.log("Notification removal error:", err.message);
  }
};
