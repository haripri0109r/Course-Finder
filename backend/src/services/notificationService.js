import Notification from '../models/Notification.js';

/**
 * Helper to generate notification messages
 */
const generateMessage = (senderName, type, postTitle = '') => {
  switch (type) {
    case 'follow':
      return `${senderName} started following you 👤`;
    case 'post_like':
      return `${senderName} liked your post: ${postTitle} ❤️`;
    case 'comment':
      return `${senderName} commented on your post: ${postTitle} 💬`;
    case 'reply':
      return `${senderName} replied to your comment 💬`;
    case 'comment_like':
      return `${senderName} liked your comment ❤️`;
    default:
      return `${senderName} interacted with you`;
  }
};

/**
 * Centralized service to create notifications with Atomic Deduplication
 */
export const createNotification = async ({ recipientId, senderId, senderName, type, relatedPostId, relatedCommentId, postTitle }) => {
  // 1. Prevent self-notifications
  if (recipientId.toString() === senderId.toString()) {
    return null;
  }

  try {
    const message = generateMessage(senderName, type, postTitle);

    // Dynamic Filter based on type
    const filter = {
      userId: recipientId,
      actorId: senderId,
      type
    };

    if (type === 'post_like' || type === 'comment') {
      filter.postId = relatedPostId;
    }

    if (type === 'comment_like' || type === 'reply') {
      filter.commentId = relatedCommentId;
    }

    const update = {
      $set: {
        message,
        isRead: false,
        updatedAt: new Date(),
        targetType: (type === 'post_like' || type === 'comment') ? 'post' : 
                    (type === 'comment_like' || type === 'reply') ? 'comment' : 'user'
      },
      $setOnInsert: {
        userId: recipientId,
        actorId: senderId,
        postId: relatedPostId,
        commentId: relatedCommentId,
        type
      }
    };

    // Atomic Upsert (Prevents Spam)
    const notification = await Notification.findOneAndUpdate(filter, update, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    });

    return notification;
  } catch (error) {
    // Handle Unique Index Collisions gracefully
    if (error.code === 11000) return null;
    console.error('Error creating notification:', error);
    return null;
  }
};

/**
 * Cleanup helper to remove notifications when actions are undone (e.g. Unlike)
 */
export const removeNotification = async ({ recipientId, senderId, type, relatedPostId, relatedCommentId }) => {
  try {
    const filter = {
      userId: recipientId,
      actorId: senderId,
      type
    };

    if (relatedPostId) filter.postId = relatedPostId;
    if (relatedCommentId) filter.commentId = relatedCommentId;

    await Notification.deleteOne(filter);
  } catch (error) {
    console.error('Error removing notification:', error);
  }
};
