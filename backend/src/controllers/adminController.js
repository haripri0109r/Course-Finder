import { User, CompletedCourse, Report, AdminAuditLog, Session } from '../models/index.js';
import { logAdminAction } from './moderationController.js';
import { escapeRegex } from '../utils/regexUtils.js';

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/v1/admin/users
// @access  Private (Admin+)
// ─────────────────────────────────────────────────────────────────────────────
export const getUsers = async (req, res) => {
  const { search, role, accountStatus, limit = 50, page = 1 } = req.query;
  const query = {};

  if (search) {
    const escapedSearch = escapeRegex(search);
    query.$or = [
      { name: { $regex: escapedSearch, $options: 'i' } },
      { email: { $regex: escapedSearch, $options: 'i' } }
    ];
  }
  if (role) query.role = role;
  if (accountStatus) query.accountStatus = accountStatus;

  const skip = (Number(page) - 1) * Number(limit);

  const users = await User.find(query)
    .select('name email role accountStatus profilePicture createdAt')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .lean();

  const total = await User.countDocuments(query);

  return res.status(200).json({
    success: true,
    data: users,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit)
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   PUT /api/v1/admin/users/:id/status
// @access  Private (Admin+)
// ─────────────────────────────────────────────────────────────────────────────
export const updateUserStatus = async (req, res) => {
  const { status, durationDays } = req.body; // status: 'ACTIVE', 'SUSPENDED', 'BANNED'
  const validStatuses = ['ACTIVE', 'SUSPENDED', 'BANNED'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  const targetUser = await User.findById(req.params.id);
  if (!targetUser) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  // Prevent admin from banning themselves or another SUPER_ADMIN unless they are SUPER_ADMIN
  if (targetUser.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, message: 'Cannot modify a SUPER_ADMIN' });
  }

  targetUser.accountStatus = status;

  if (status === 'SUSPENDED') {
    const days = Number(durationDays) || 7;
    targetUser.suspensionExpiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  } else {
    targetUser.suspensionExpiresAt = null;
  }

  await targetUser.save();

  // If banned or suspended, optionally revoke sessions
  if (status === 'BANNED' || status === 'SUSPENDED') {
    await Session.updateMany({ userId: targetUser._id }, { isRevoked: true });
  }

  // Audit
  await logAdminAction(req.user._id, `SET_STATUS_${status}`, 'USER', targetUser._id, { durationDays });

  return res.status(200).json({ success: true, message: `User status updated to ${status}` });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   PUT /api/v1/admin/users/:id/role
// @access  Private (SUPER_ADMIN only)
// ─────────────────────────────────────────────────────────────────────────────
export const updateUserRole = async (req, res) => {
  const { role } = req.body;
  const validRoles = ['USER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'];

  if (!validRoles.includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role' });
  }

  const targetUser = await User.findById(req.params.id);
  if (!targetUser) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const oldRole = targetUser.role;
  targetUser.role = role;
  await targetUser.save();

  await logAdminAction(req.user._id, 'CHANGE_ROLE', 'USER', targetUser._id, { oldRole, newRole: role });

  return res.status(200).json({ success: true, message: `User role updated to ${role}` });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/v1/admin/analytics
// @access  Private (Admin+)
// ─────────────────────────────────────────────────────────────────────────────
export const getAdminAnalytics = async (req, res) => {
  const [totalUsers, activeUsers, totalPosts, totalReports, openReports] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ accountStatus: 'ACTIVE' }),
    CompletedCourse.countDocuments({ isRemoved: false }),
    Report.countDocuments(),
    Report.countDocuments({ status: { $in: ['OPEN', 'UNDER_REVIEW'] } })
  ]);

  // Optionally fetch daily new users or posts here using aggregation

  return res.status(200).json({
    success: true,
    data: {
      totalUsers,
      activeUsers,
      totalPosts,
      totalReports,
      openReports
    }
  });
};
