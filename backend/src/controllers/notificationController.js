import Notification from '../models/Notification.js';

// 📥 Get Notifications Feed (Bulletproof & Compatible)
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .populate('actorId', 'name avatar')
      .sort({ updatedAt: -1, _id: -1 })
      .lean();

    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
};

// 🔢 Get Unread Count (Compatible & Safe)
export const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user.id,
      isRead: false
    });

    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ count: 0 });
  }
};

// ✅ Mark All as Read (Batch Operation)
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, isRead: false },
      { isRead: true }
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Mark all read error:", error.message);
    res.status(500).json({ success: false });
  }
};

// 🗑️ Mark Single as Read
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    return res.status(200).json({ success: true, data: notification });
  } catch (error) {
    console.error("Mark read error:", error.message);
    res.status(500).json({ success: false });
  }
};
