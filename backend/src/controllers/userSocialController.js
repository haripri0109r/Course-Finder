import User from '../models/User.js';
import { createNotification } from '../services/notificationService.js';

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/auth/follow/:id
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const followUser = async (req, res) => {
  const targetId = req.params.id;
  const userId = req.user._id;

  if (targetId === userId.toString()) {
    return res.status(400).json({
      success: false,
      message: 'You cannot follow yourself.',
    });
  }

  const user = await User.findById(userId);
  const target = await User.findById(targetId);

  if (!target) {
    return res.status(404).json({
      success: false,
      message: 'User not found.',
    });
  }

  // Prevent duplicate follows
  if (user.following.includes(targetId)) {
    return res.status(400).json({
      success: false,
      message: 'Already following this user.',
    });
  }

  // Reciprocal update
  await User.findByIdAndUpdate(userId, { $push: { following: targetId } });
  await User.findByIdAndUpdate(targetId, { $push: { followers: userId } });

  // Trigger Notification
  await createNotification({
    recipientId: targetId,
    senderId: userId,
    senderName: user.name,
    type: 'follow',
  });

  return res.status(200).json({
    success: true,
    message: `You are now following ${target.name}.`,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/auth/unfollow/:id
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const unfollowUser = async (req, res) => {
  const targetId = req.params.id;
  const userId = req.user._id;

  const user = await User.findById(userId);
  if (!user.following.includes(targetId)) {
    return res.status(400).json({
      success: false,
      message: 'You are not following this user.',
    });
  }

  // Reciprocal update
  await User.findByIdAndUpdate(userId, { $pull: { following: targetId } });
  await User.findByIdAndUpdate(targetId, { $pull: { followers: userId } });

  return res.status(200).json({
    success: true,
    message: 'User unfollowed.',
  });
};

export {
  followUser,
  unfollowUser,
};
