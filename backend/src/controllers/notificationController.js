// 📥 Get Notifications Feed
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    // Backward compatibility filter: handle both 'userId' and legacy 'recipient'
    const userFilter = {
      $or: [
        { userId: userId },
        { recipient: userId }
      ]
    };

    const notifications = await Notification.find(userFilter)
      .populate('actorId', 'name profilePicture')
      .sort({ updatedAt: -1, _id: -1 })
      .limit(50)
      .lean();

    return res.status(200).json(notifications || []);
  } catch (error) {
    console.error("Fetch notifications error:", error.message);
    return res.status(200).json([]); // Safe fallback to prevent frontend crash
  }
};

// ✅ Mark All as Read (Batch Operation)
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    
    await Notification.updateMany(
      { 
        $or: [{ userId }, { recipient: userId }], 
        isRead: false 
      },
      { $set: { isRead: true } }
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Mark all read error:", error.message);
    return res.status(200).json({ success: true }); // Safe fallback
  }
};

// 🔢 Get Unread Count (Optimized & Crash-Safe)
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    if (!userId) {
      return res.status(200).json({ count: 0 });
    }

    const count = await Notification.countDocuments({
      $or: [{ userId }, { recipient: userId }],
      isRead: false,
    });

    return res.status(200).json({ count: count || 0 });
  } catch (error) {
    console.error("Unread count error:", error.message);
    return res.status(200).json({ count: 0 }); // Never crash the frontend
  }
};

// 🗑️ Mark Single as Read
export const markAsRead = async (req, res) => {
  const userId = req.user._id || req.user.id;
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
