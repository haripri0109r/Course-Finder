import Notification from '../models/Notification.js';

// 📥 Get Notifications Feed (Bulletproof & Compatible)
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    if (!userId) return res.status(200).json([]);

    // 🧱 Shared Filter for Backward Compatibility
    const userFilter = {
      $or: [
        { userId: userId },
        { user: userId } // support for legacy data (old field name)
      ]
    };

    const notifications = await Notification.find(userFilter)
      .sort({ updatedAt: -1, _id: -1 })
      .limit(50)
      .lean();

    res.json(notifications || []);
  } catch (error) {
    console.error("Fetch notifications error:", error.message);
    res.status(200).json([]); // ✅ Safe fallback: NEVER crash frontend
  }
};

// 🔢 Get Unread Count (Compatible & Safe)
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    if (!userId) return res.status(200).json({ count: 0 });

    const count = await Notification.countDocuments({
      $or: [{ userId }, { user: userId }],
      isRead: false,
    });

    res.json({ count: count || 0 });
  } catch (error) {
    console.error("Unread count error:", error.message);
    res.status(200).json({ count: 0 }); // ✅ Safe fallback
  }
};

// ✅ Mark All as Read (Batch Operation)
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    
    await Notification.updateMany(
      { 
        $or: [{ userId }, { user: userId }], 
        isRead: false 
      },
      { isRead: true }
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Mark all read error:", error.message);
    res.status(200).json({ success: false }); // ✅ Safe fallback
  }
};

// 🗑️ Mark Single as Read
export const markAsRead = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, $or: [{ userId }, { user: userId }] },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    return res.status(200).json({ success: true, data: notification });
  } catch (error) {
    console.error("Mark read error:", error.message);
    res.status(200).json({ success: false });
  }
};
