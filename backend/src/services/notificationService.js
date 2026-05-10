import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

const sendPushNotification = async (expoPushToken, title, message, dataPayload) => {
  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: expoPushToken,
        sound: "default",
        title: title,
        body: message,
        android: { channelId: "default" },
        data: dataPayload
      }),
    });

    const data = await response.json();
    console.log("EXPO RESPONSE:", data);

  } catch (error) {
    console.log("PUSH ERROR:", error);
  }
};

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
    const recipient = await User.findById(userId).select("expoPushTokens");

    if (global.io) {
      global.io.to(userId.toString()).emit("new_notification", {
        _id: notification._id,
        actorName: user?.name || "Someone",
        postId: notification.postId,
        type: notification.type,
        createdAt: notification.createdAt
      });
    }

    // --- Send Expo Push Notification to ALL user devices ---
    console.log("TOKENS FROM DB:", recipient?.expoPushTokens);
    if (recipient && recipient.expoPushTokens && recipient.expoPushTokens.length > 0) {
      let bodyText = "New activity detected";
      if (type === "follow") bodyText = `${user?.name || "Someone"} started following you.`;
      else if (type === "like" || type === "post_like") bodyText = `${user?.name || "Someone"} liked your post.`;
      else if (type === "comment") bodyText = `${user?.name || "Someone"} commented on your post.`;

      for (const token of recipient.expoPushTokens) {
        await sendPushNotification(
          token,
          user?.name ? `New from ${user.name}` : 'Course Finder',
          bodyText,
          {
            type,
            postId,
            actorId
          }
        );
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
