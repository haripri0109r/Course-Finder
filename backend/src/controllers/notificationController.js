import Notification from '../models/Notification.js';

// 📥 Get Notifications
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .populate('actorId', 'name avatar')
      .sort({ createdAt: -1 })
      .lean();

    res.json(notifications || []);
  } catch (err) {
    console.error("Fetch notifications error:", err);
    res.json([]);
  }
};

// 🔢 Get Unread Count
export const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user.id,
      isRead: false
    });

    res.json({ count });
  } catch (err) {
    console.error("Unread count error:", err);
    res.json({ count: 0 });
  }
};

// ✅ Mark All as Read
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, isRead: false },
      { isRead: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Mark all read error:", err);
    res.json({ success: false });
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

    res.json({ success: true, data: notification });
  } catch (err) {
    console.error("Mark read error:", err);
    res.json({ success: false });
  }
};
