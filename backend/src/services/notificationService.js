import Notification from '../models/Notification.js';

/**
 * Helper to generate notification messages
 */
const generateMessage = (senderName, type, postTitle = '') => {
  switch (type) {
    case 'follow':
      return `${senderName} started following you 👤`;
    case 'like':
      return `${senderName} liked your post: ${postTitle} ❤️`;
    case 'comment':
      return `${senderName} commented on your post: ${postTitle} 💬`;
    default:
      return `${senderName} interacted with you`;
  }
};

/**
 * Centralized service to create notifications
 */
export const createNotification = async ({ recipientId, senderId, senderName, type, relatedPostId, postTitle }) => {
  // 1. Prevent self-notifications
  if (recipientId.toString() === senderId.toString()) {
    return null;
  }

  try {
    const message = generateMessage(senderName, type, postTitle);

    const notification = await Notification.create({
      recipient: recipientId,
      sender: senderId,
      type,
      relatedPost: relatedPostId,
      message,
    });

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};
