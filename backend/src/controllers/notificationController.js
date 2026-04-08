export const getNotifications = async (req, res) => {
  const notifications = await Notification.find({ userId: req.user._id })
    .populate('actorId', 'name profilePicture')
    .sort({ updatedAt: -1, _id: -1 })
    .limit(50)
    .lean();

  return res.status(200).json({
    success: true,
    count: notifications.length,
    data: notifications,
  });
};

// ✅ Mark All as Read (Batch Operation)
export const markAllAsRead = async (req, res) => {
  await Notification.updateMany(
    { userId: req.user._id, isRead: false },
    { $set: { isRead: true } }
  );

  return res.status(200).json({
    success: true,
    message: 'All notifications marked as read',
  });
};

// 🔢 Get Unread Count (Optimized)
export const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user._id,
      isRead: false,
    });

    return res.status(200).json({ count });
  } catch (error) {
    console.error("Unread count error:", error);
    return res.status(500).json({ message: "Failed to fetch unread count" });
  }
};

// 🗑️ Mark Single as Read
export const markAsRead = async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found',
    });
  }

  return res.status(200).json({
    success: true,
    data: notification,
  });
};
