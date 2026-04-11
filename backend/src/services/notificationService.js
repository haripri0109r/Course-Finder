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
  // Prevent self notification
  if (!userId || !actorId) return;
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
 * Remove notification (e.g. on unlike)
 */
export const removeNotification = async ({ userId, actorId, type, postId, commentId }) => {
  try {
    const filter = { userId, actorId, type };
    if (postId) filter.postId = postId;
    if (commentId) filter.commentId = commentId;

    await Notification.deleteOne(filter);
  } catch (err) {
    console.error("Notification removal error:", err);
  }
};
