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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Fetch the user (exclude password field)
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized — user no longer exists',
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

export { authenticate, authenticate as protect };
