import { Notification } from '../models/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/notifications
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const getNotifications = async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user._id })
    .populate('sender', 'name profilePicture')
    .populate({
      path: 'relatedPost',
      populate: { path: 'course', select: 'title' }
    })
    .sort({ createdAt: -1 })
    .limit(50);

  return res.status(200).json({
    success: true,
    count: notifications.length,
    data: notifications,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   PATCH /api/notifications/:id/read
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const markAsRead = async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
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

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/notifications/unread-count
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const getUnreadCount = async (req, res) => {
  const count = await Notification.countDocuments({
    recipient: req.user._id,
    isRead: false,
  });

  return res.status(200).json({
    success: true,
    unreadCount: count,
  });
};

export { getNotifications, markAsRead, getUnreadCount };
