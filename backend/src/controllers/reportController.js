import { Report, User, CompletedCourse, Comment } from '../models/index.js';
import mongoose from 'mongoose';

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/v1/reports
// @access  Private (Not Suspended)
// @desc    Create a new report for a User, Post, or Comment
// ─────────────────────────────────────────────────────────────────────────────
export const createReport = async (req, res) => {
  const { targetType, targetId, category, reason } = req.body;

  if (!['USER', 'POST', 'COMMENT'].includes(targetType)) {
    return res.status(400).json({ success: false, message: 'Invalid targetType' });
  }

  if (!mongoose.Types.ObjectId.isValid(targetId)) {
    return res.status(400).json({ success: false, message: 'Invalid targetId format' });
  }

  // ─── Target Existence Validation ───────────────────────────────────────────
  let targetExists = false;
  if (targetType === 'USER') {
    targetExists = await User.exists({ _id: targetId });
  } else if (targetType === 'POST') {
    targetExists = await CompletedCourse.exists({ _id: targetId, isRemoved: false });
  } else if (targetType === 'COMMENT') {
    targetExists = await Comment.exists({ _id: targetId, isRemoved: false });
  }

  if (!targetExists) {
    return res.status(404).json({ success: false, message: `Report target (${targetType}) not found or already removed` });
  }

  const validCategories = ['Spam', 'Harassment', 'Fake Certificate', 'Copyright', 'Inappropriate Content', 'Other'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ success: false, message: 'Invalid category' });
  }

  // Prevent users from reporting the same exact item multiple times unnecessarily
  const existingReport = await Report.findOne({
    reporterId: req.user._id,
    targetType,
    targetId,
    status: { $in: ['OPEN', 'UNDER_REVIEW'] }
  });

  if (existingReport) {
    return res.status(400).json({ success: false, message: 'You already have an active report for this item.' });
  }

  const report = await Report.create({
    reporterId: req.user._id,
    targetType,
    targetId,
    category,
    reason: reason ? reason.substring(0, 1000) : '',
  });

  return res.status(201).json({
    success: true,
    message: 'Report submitted successfully. Our moderation team will review it.',
    data: report,
  });
};
