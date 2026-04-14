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
    const recipient = await User.findById(userId).select("expoPushToken");

    if (global.io) {
      global.io.to(userId.toString()).emit("new_notification", {
        _id: notification._id,
        actorName: user?.name || "Someone",
        postId: notification.postId,
        type: notification.type,
        createdAt: notification.createdAt
      });
    }

    // --- NEW: Send Expo Push Notification ---
    if (recipient && recipient.expoPushToken) {
      let bodyText = "New activity detected";
      if (type === "follow") bodyText = `${user?.name || "Someone"} started following you.`;
      else if (type === "like" || type === "post_like") bodyText = `${user?.name || "Someone"} liked your post.`;
      else if (type === "comment") bodyText = `${user?.name || "Someone"} commented on your post.`;

      try {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: recipient.expoPushToken,
            title: user?.name ? `New from ${user.name}` : 'Course Finder',
            body: bodyText,
            sound: 'default',
            data: { postId, type, actorId },
          }),
        });
        console.log(`✅ Expo push sent to ${recipient.expoPushToken}`);
      } catch (pushErr) {
        console.error("❌ Expo push API error:", pushErr.message);
      }
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
