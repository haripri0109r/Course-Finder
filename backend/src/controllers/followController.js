import User from '../models/User.js';
import { createNotification } from '../services/notificationService.js';

export const toggleFollow = async (req, res) => {
  try {
    const userId = req.user.id;
    const targetId = req.params.id;

    if (userId === targetId) {
      return res.status(400).json({ message: "Cannot follow yourself" });
    }

    const target = await User.findById(targetId);
    if (!target) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = await User.findById(userId);
    const isFollowing = user.following.includes(targetId);

    if (isFollowing) {
      // Atomic pull — no race condition
      await User.findByIdAndUpdate(userId, { $pull: { following: targetId } });
      await User.findByIdAndUpdate(targetId, { $pull: { followers: userId } });
    } else {
      // $addToSet — prevents duplicates under concurrent requests
      await User.findByIdAndUpdate(userId, { $addToSet: { following: targetId } });
      await User.findByIdAndUpdate(targetId, { $addToSet: { followers: userId } });

      await createNotification({
        userId: targetId,
        actorId: userId,
        type: "follow"
      });
    }

    res.json({ success: true, isFollowing: !isFollowing });
  } catch (err) {
    console.log("Toggle follow error:", err.message);
    res.status(500).json({ message: "Follow action failed" });
  }
};
