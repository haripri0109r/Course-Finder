import Notification from '../models/Notification.js';

// 📥 Get Notifications (with pagination)
export const getNotifications = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const cursor = req.query.cursor;

    const query = { userId: req.user.id };
    if (cursor) {
      query._id = { $lt: cursor };
    }

    const notifications = await Notification.find(query)
      .populate('actorId', 'name profilePicture')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const nextCursor = notifications.length === limit
      ? notifications[notifications.length - 1]._id
      : null;

    res.json({
      success: true,
      data: notifications || [],
      nextCursor,
    });
  } catch (err) {
    console.error("Fetch notifications error:", err);
    res.json({ success: true, data: [], nextCursor: null });
  }
};

// 🔢 Get Unread Count
export const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user.id,
      isRead: false
    });

    res.json({ success: true, unreadCount: count });
  } catch (err) {
    console.error("Unread count error:", err);
    res.json({ success: true, unreadCount: 0 });
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
