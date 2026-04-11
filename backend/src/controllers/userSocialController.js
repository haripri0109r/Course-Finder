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

    const user = await User.findById(userId);
    const target = await User.findById(targetId);

    if (!target) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    if (user.following.includes(targetId)) {
      return res.status(400).json({
        success: false,
        message: 'Already following this user.',
      });
    }

    user.following.push(targetId);
    target.followers.push(userId);

    await user.save();
    await target.save();

    // ✅ FIXED: correct field names for notification
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

    const target = await User.findById(targetId);

    user.following.pull(targetId);
    target.followers.pull(userId);

    await user.save();
    await target.save();

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
