import Notification from '../models/Notification.js';

/**
 * Standardized createNotification with Atomic Upsert (Prevents Duplicates)
 */
export const createNotification = async ({
  userId,
  actorId,
  type,
  postId,
  commentId
}) => {
  // ❌ Prevent self notification
  if (userId.toString() === actorId.toString()) return;

  try {
    await Notification.findOneAndUpdate(
      { userId, actorId, postId, commentId, type },
      { isRead: false },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error("Notification error:", err);
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
