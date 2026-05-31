import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

/**
 * Authenticate middleware — verifies the Bearer token and attaches req.user.
 * Throws 401 if token is missing, invalid, or expired.
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // 1. Check that the Authorization header exists and starts with "Bearer "
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized — no token provided',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    // 2. Verify the token — throws if expired or tampered
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is not defined');
    }
    const decoded = jwt.verify(token, secret);

    // 3. Fetch the user (exclude password field and heavy arrays)
    const user = await User.findById(decoded.id)
      .select('name email role accountStatus suspensionExpiresAt');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized — user no longer exists',
      });
    }

    if (user.accountStatus === 'BANNED') {
      return res.status(403).json({
        success: false,
        message: 'Account banned. Access denied.',
      });
    }

    // 4. Attach user to request for downstream route handlers
    req.user = user;
    next();
  } catch (error) {
    const message =
      error.name === 'TokenExpiredError'
        ? 'Token expired — please log in again'
        : 'Not authorized — invalid token';

    return res.status(401).json({ success: false, message });
  }
};

/**
 * Role checking middleware factory.
 * @param {Array<string>} roles - Allowed roles (e.g. ['ADMIN', 'SUPER_ADMIN'])
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden — insufficient permissions',
      });
    }
    next();
  };
};

/**
 * Ensure user is not suspended for write actions.
 * Suspended users can read but not write.
 */
const enforceNotSuspended = async (req, res, next) => {
  if (req.user && req.user.accountStatus === 'SUSPENDED') {
    // Check if suspension has expired
    if (req.user.suspensionExpiresAt && new Date() > req.user.suspensionExpiresAt) {
      // It has expired, update the user in DB and allow access
      try {
        await User.findByIdAndUpdate(req.user._id, {
          accountStatus: 'ACTIVE',
          suspensionExpiresAt: null,
        });
        // Update the req.user object for downstream logic
        req.user.accountStatus = 'ACTIVE';
        req.user.suspensionExpiresAt = null;
        return next();
      } catch (err) {
        console.error('Failed to auto-clear suspension:', err.message);
        // Fall through to denying access if DB update fails, for safety
      }
    }
    return res.status(403).json({
      success: false,
      message: 'Account suspended. Action denied.',
    });
  }
  next();
};

const requireAdmin = requireRole(['ADMIN', 'SUPER_ADMIN']);
const requireModerator = requireRole(['MODERATOR', 'ADMIN', 'SUPER_ADMIN']);
const requireSuperAdmin = requireRole(['SUPER_ADMIN']);

export { authenticate, authenticate as protect, requireRole, requireAdmin, requireModerator, requireSuperAdmin, enforceNotSuspended };
