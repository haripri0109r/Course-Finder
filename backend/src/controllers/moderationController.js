import { Report, CompletedCourse, Comment, AdminAuditLog } from '../models/index.js';

// Helper to log admin/mod actions
export const logAdminAction = async (adminId, action, targetType, targetId, metadata = {}) => {
  await AdminAuditLog.create({
    adminId,
    action,
    targetType,
    targetId,
    metadata
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/v1/moderation/reports
// @access  Private (Moderator+)
// ─────────────────────────────────────────────────────────────────────────────
export const getReports = async (req, res) => {
  const { status, targetType, limit = 50, page = 1 } = req.query;
  const query = {};
  
  if (status) query.status = status;
  if (targetType) query.targetType = targetType;

  const skip = (Number(page) - 1) * Number(limit);

  const reports = await Report.find(query)
    .populate('reporterId', 'name email profilePicture')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .lean();

  const total = await Report.countDocuments(query);

  return res.status(200).json({
    success: true,
    data: reports,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit)
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   PUT /api/v1/moderation/reports/:id/status
// @access  Private (Moderator+)
// ─────────────────────────────────────────────────────────────────────────────
export const updateReportStatus = async (req, res) => {
  const { status, resolutionNotes } = req.body;
  const validStatuses = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  const report = await Report.findById(req.params.id);
  if (!report) {
    return res.status(404).json({ success: false, message: 'Report not found' });
  }

  const oldStatus = report.status;
  report.status = status;
  if (status === 'UNDER_REVIEW' && !report.assignedModeratorId) {
    report.assignedModeratorId = req.user._id;
  }
  if (resolutionNotes) {
    report.resolutionNotes = resolutionNotes;
  }

  await report.save();

  // Audit
  await logAdminAction(req.user._id, 'UPDATE_REPORT_STATUS', 'REPORT', report._id, { oldStatus, newStatus: status });

  return res.status(200).json({ success: true, data: report });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   PUT /api/v1/moderation/content/:type/:id/status
// @access  Private (Moderator+)
// @desc    type can be 'post' or 'comment'
// ─────────────────────────────────────────────────────────────────────────────
export const toggleContentStatus = async (req, res) => {
  const { type, id } = req.params;
  const { isRemoved, removalReason } = req.body;

  if (typeof isRemoved !== 'boolean') {
    return res.status(400).json({ success: false, message: 'isRemoved must be boolean' });
  }

  let Model;
  let targetTypeLog;
  if (type === 'post') {
    Model = CompletedCourse;
    targetTypeLog = 'POST';
  } else if (type === 'comment') {
    Model = Comment;
    targetTypeLog = 'COMMENT';
  } else {
    return res.status(400).json({ success: false, message: 'Invalid content type' });
  }

  const item = await Model.findById(id);
  if (!item) {
    return res.status(404).json({ success: false, message: 'Content not found' });
  }

  const oldRemovedStatus = item.isRemoved;
  item.isRemoved = isRemoved;
  item.removedBy = isRemoved ? req.user._id : null;
  item.removedAt = isRemoved ? new Date() : null;
  item.removalReason = isRemoved ? (removalReason || 'Violation of community guidelines') : null;

  await item.save();

  // ─── Post-Mutation Logic ───────────────────────────────────────────────────
  // If a comment's removal status changed, update the post's commentCount
  if (type === 'comment' && oldRemovedStatus !== isRemoved) {
    const inc = isRemoved ? -1 : 1;
    await CompletedCourse.findByIdAndUpdate(item.postId, { $inc: { commentCount: inc } });
  }

  // Audit
  await logAdminAction(req.user._id, isRemoved ? 'REMOVE_CONTENT' : 'RESTORE_CONTENT', targetTypeLog, item._id, { removalReason: item.removalReason });

  return res.status(200).json({ success: true, message: `Content ${isRemoved ? 'removed' : 'restored'}` });
};
