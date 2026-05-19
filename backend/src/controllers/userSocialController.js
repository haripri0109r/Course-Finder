import { User, Follow, ActivityEvent } from '../models/index.js';
import { createNotification } from '../services/notificationService.js';
import mongoose from 'mongoose';

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/v1/auth/follow/:id
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
export const followUser = async (req, res) => {
  try {
    const targetId = req.params.id;
    const userId = req.user._id || req.user.id;

    if (targetId === userId.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot follow yourself.' });
    }

    const target = await User.findById(targetId).select('_id name').lean();
    if (!target) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Atomic Follow creation - relying on compound unique index [followerId, followingId]
    try {
      await Follow.create({ followerId: userId, followingId: targetId });
    } catch (err) {
      if (err.code === 11000) { // Duplicate key error
        return res.status(400).json({ success: false, message: 'Already following this user.' });
      }
      throw err;
    }

    // If we reach here, the follow was successfully inserted. Increment safely.
    await Promise.all([
      User.findByIdAndUpdate(userId, { $inc: { followingCount: 1 } }),
      User.findByIdAndUpdate(targetId, { $inc: { followersCount: 1 } }),
      ActivityEvent.create({ userId, eventType: 'follow', targetId }),
    ]);

    // Send notification
    await createNotification({
      userId: targetId.toString(),
      actorId: userId.toString(),
      type: 'follow',
    }).catch(err => console.error("Notification failed:", err));

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
export const unfollowUser = async (req, res) => {
  try {
    const targetId = req.params.id;
    const userId = req.user._id || req.user.id;

    // Atomic delete
    const follow = await Follow.findOneAndDelete({ followerId: userId, followingId: targetId });
    
    // Only decrement if a follow relationship was actually deleted
    if (follow) {
      await Promise.all([
        User.findByIdAndUpdate(userId, { $inc: { followingCount: -1 } }),
        User.findByIdAndUpdate(targetId, { $inc: { followersCount: -1 } }),
        // Optional: remove the ActivityEvent to clean up analytics
        ActivityEvent.findOneAndDelete({ userId, eventType: 'follow', targetId }),
      ]);
    } else {
      return res.status(400).json({ success: false, message: 'You are not following this user.' });
    }

    return res.status(200).json({ success: true, message: 'User unfollowed.' });
  } catch (err) {
    console.error("Unfollow error:", err);
    res.status(500).json({ success: false, message: 'Unfollow failed' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/v1/auth/users/:id/followers
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
export const getFollowers = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const cursor = req.query.cursor;
    
    const query = { followingId: req.params.id };
    if (cursor) {
      query._id = { $lt: cursor };
    }

    const followersList = await Follow.find(query)
      .sort({ _id: -1 })
      .limit(limit)
      .populate('followerId', 'name profilePicture headline')
      .lean();

    const nextCursor = followersList.length === limit ? followersList[followersList.length - 1]._id : null;

    res.status(200).json({ success: true, data: followersList, nextCursor });
  } catch (err) {
    console.error("Get followers error:", err);
    res.status(500).json({ success: false, message: 'Failed to fetch followers' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/v1/auth/users/:id/following
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
export const getFollowing = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const cursor = req.query.cursor;
    
    const query = { followerId: req.params.id };
    if (cursor) {
      query._id = { $lt: cursor };
    }

    const followingList = await Follow.find(query)
      .sort({ _id: -1 })
      .limit(limit)
      .populate('followingId', 'name profilePicture headline')
      .lean();

    const nextCursor = followingList.length === limit ? followingList[followingList.length - 1]._id : null;

    res.status(200).json({ success: true, data: followingList, nextCursor });
  } catch (err) {
    console.error("Get following error:", err);
    res.status(500).json({ success: false, message: 'Failed to fetch following list' });
  }
};
