import Notification from '../models/Notification.js';

/**
 * Standardized createNotification with Atomic Upsert (Prevents Duplicates)
 */
export const createNotification = async ({ 
  userId, 
  actorId, 
  postId, 
  commentId, 
  type 
}) => {
  // 1. Validation & Self-filtering
  if (!userId || !actorId || userId.toString() === actorId.toString()) {
    return null;
  }

  try {
    const filter = {
      userId,
      actorId,
      type,
      ...(postId && { postId }),
      ...(commentId && { commentId })
    };

    const update = {
      userId,
      actorId,
      postId,
      commentId,
      type,
      isRead: false
    };

    const notification = await Notification.findOneAndUpdate(filter, update, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    });

    return notification;
  } catch (error) {
    console.error('Notification creation error:', error.message);
    return null;
  }
};

/**
 * Cleanup helper to remove notifications when actions are undone (e.g. Unlike)
 */
export const removeNotification = async ({ userId, actorId, type, postId, commentId }) => {
  try {
    const filter = {
      userId,
      actorId,
      type
    };

    if (postId) filter.postId = postId;
    if (commentId) filter.commentId = commentId;

    await Notification.deleteOne(filter);
  } catch (error) {
    console.error('Notification removal error:', error.message);
  }
};
