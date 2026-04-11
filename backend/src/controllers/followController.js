import User from '../models/User.js';
import { createNotification } from '../services/notificationService.js';

export const toggleFollow = async (req, res) => {
  try {
    const userId = req.user.id;
    const targetId = req.params.id;

    if (userId === targetId)
      return res.status(400).json({ message: "Cannot follow yourself" });

    const user = await User.findById(userId);
    const target = await User.findById(targetId);

    if (!target) {
      return res.status(404).json({ message: "User not found" });
    }

    const isFollowing = user.following.includes(targetId);

    if (isFollowing) {
      user.following.pull(targetId);
      target.followers.pull(userId);
    } else {
      user.following.push(targetId);
      target.followers.push(userId);

      await createNotification({
        userId: targetId,
        actorId: userId,
        type: "follow"
      });
    }

    await user.save();
    await target.save();

    res.json({ success: true, isFollowing: !isFollowing });
  } catch (err) {
    console.error("Toggle follow error:", err);
    res.status(500).json({ message: "Interaction failed" });
  }
};
