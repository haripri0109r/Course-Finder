import User from '../models/User.js';
import { createNotification } from '../services/notificationService.js';

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/v1/auth/follow/:id
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const followUser = async (req, res) => {
  try {
    const targetId = req.params.id;
    const userId = req.user.id;

    if (targetId === userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot follow yourself.',
      });
    }

    const target = await User.findById(targetId);
    if (!target) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const user = await User.findById(userId);
    if (user.following.includes(targetId)) {
      return res.status(400).json({
        success: false,
        message: 'Already following this user.',
      });
    }

    // $addToSet — prevents duplicates even under concurrent requests
    await User.findByIdAndUpdate(userId, { $addToSet: { following: targetId } });
    await User.findByIdAndUpdate(targetId, { $addToSet: { followers: userId } });

    await createNotification({
      userId: targetId,
      actorId: userId,
      type: 'follow',
    });

    return res.status(200).json({
      success: true,
      message: `You are now following ${target.name}.`,
    });
  } catch (err) {
    console.error("Follow error:", err);
    res.status(500).json({ success: false, message: 'Follow failed' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/v1/auth/unfollow/:id
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const unfollowUser = async (req, res) => {
  try {
    const targetId = req.params.id;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user.following.includes(targetId)) {
      return res.status(400).json({
        success: false,
        message: 'You are not following this user.',
      });
    }

    // Atomic pull — no race condition
    await User.findByIdAndUpdate(userId, { $pull: { following: targetId } });
    await User.findByIdAndUpdate(targetId, { $pull: { followers: userId } });

    return res.status(200).json({
      success: true,
      message: 'User unfollowed.',
    });
  } catch (err) {
    console.error("Unfollow error:", err);
    res.status(500).json({ success: false, message: 'Unfollow failed' });
  }
};

export {
  followUser,
  unfollowUser,
};
