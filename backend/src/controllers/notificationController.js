import Notification from '../models/Notification.js';

// 📥 Get Notifications Feed (Bulletproof & Compatible)
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    if (!userId) return res.status(200).json([]);

    // Backward compatibility filter: handle both 'userId' and legacy 'user'
    const userFilter = {
      $or: [
        { userId: userId },
        { user: userId }
      ]
    };

    const notifications = await Notification.find(userFilter)
      .sort({ updatedAt: -1, _id: -1 })
      .limit(50)
      .lean();

    return res.status(200).json(notifications || []);
  } catch (error) {
    console.error("Fetch notifications error:", error.message);
    return res.status(200).json([]); // NEVER crash frontend
  }
};

// 🔢 Get Unread Count (Safe & Accurate)
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    if (!userId) {
      return res.status(200).json({ count: 0 });
    }

    const count = await Notification.countDocuments({
      $or: [{ userId }, { user: userId }],
      isRead: false,
    });

    return res.status(200).json({ count: count || 0 });
  } catch (error) {
    console.error("Unread count error:", error.message);
    return res.status(200).json({ count: 0 });
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
      { $set: { isRead: true } }
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Mark all read error:", error.message);
    return res.status(200).json({ success: false });
  }
};

// 🗑️ Mark Single as Read
export const markAsRead = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    return res.status(200).json({ success: true, data: notification });
  } catch (error) {
    console.error("Mark read error:", error.message);
    return res.status(200).json({ success: false });
  }
};
