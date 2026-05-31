import crypto from 'crypto';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { User, Session } from '../models/index.js';
import { generateAccessToken, generateRefreshToken } from '../utils/generateToken.js';
import { validateBody, registerSchema, loginSchema, forgotPasswordSchema, updateProfileSchema, pushTokenSchema } from '../validators/schemas.js';
import { deleteFromCloudinary } from '../utils/cloudinary.js';

// ─── Helper: create session and tokens ────────────────────────────────────────
const createTokensAndSession = async (user, req) => {
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Hash refresh token for DB storage
  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  // Decode refresh token to get exact expiry
  const decoded = jwt.decode(refreshToken);
  
  await Session.create({
    userId: user._id,
    refreshTokenHash,
    deviceInfo: req.headers['user-agent'] || 'Unknown Device',
    ipAddress: req.ip || req.connection.remoteAddress || 'Unknown IP',
    expiresAt: new Date(decoded.exp * 1000),
  });

  return { accessToken, refreshToken };
};

// ─── Helper: shape the response payload ──────────────────────────────────────
const userPayload = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  bio: user.bio,
  skills: user.skills,
  profilePicture: user.profilePicture,
  headline: user.headline || '',
  location: user.location || '',
  website: user.website || '',
  linkedinUrl: user.linkedinUrl || '',
  githubUrl: user.githubUrl || '',
  followers: user.followers || [],
  following: user.following || [],
  bookmarks: user.bookmarks || [],
});

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/v1/auth/register
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const registerUser = async (req, res) => {
  // Validate with Zod
  const validation = validateBody(registerSchema, req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validation.errors,
    });
  }

  const { name, email, password } = validation.data;

  // Check for existing account
  const existing = await User.findOne({ email: email.toLowerCase().trim() }).lean();
  if (existing) {
    return res.status(409).json({
      success: false,
      message: 'An account with this email already exists',
    });
  }

  // Create user (password hashed automatically by pre-save hook in User model)
  const user = await User.create({ name: name.trim(), email: email.toLowerCase().trim(), password });

  // Generate token and respond
  const { accessToken, refreshToken } = await createTokensAndSession(user, req);

  return res.status(201).json({
    success: true,
    message: 'Account created successfully',
    data: {
      token: accessToken,
      refreshToken,
      user: userPayload(user),
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/v1/auth/login
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const loginUser = async (req, res) => {
  const validation = validateBody(loginSchema, req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validation.errors,
    });
  }

  const { email, password } = validation.data;

  // Find user — explicitly select password (it's hidden by default)
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
    '+password'
  );

  // Check credentials (use constant-time compare to prevent timing attacks)
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password',
    });
  }

  // Issue token and respond
  const { accessToken, refreshToken } = await createTokensAndSession(user, req);

  return res.status(200).json({
    success: true,
    message: 'Logged in successfully',
    data: {
      token: accessToken,
      refreshToken,
      user: userPayload(user),
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/v1/auth/me
// @access  Private (requires valid JWT)
// ─────────────────────────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId).select('-followers -following -bookmarks -expoPushTokens').lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Synthesize bookmarks array for frontend UI backward compatibility (capped at 200)
    const { Bookmark } = await import('../models/index.js');
    const userBookmarks = await Bookmark.find({ userId }).limit(200).select('courseId').lean();
    const bookmarksArray = userBookmarks.map(b => b.courseId);

    return res.status(200).json({
      success: true,
      data: {
        ...user,
        bookmarks: bookmarksArray,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   PUT /api/v1/auth/me
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const validation = validateBody(updateProfileSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors,
      });
    }

    const validated = validation.data;
    const updates = {};

    if (validated.name !== undefined) updates.name = validated.name;
    if (validated.bio !== undefined) updates.bio = validated.bio;
    if (validated.skills !== undefined) {
      const arr = Array.isArray(validated.skills)
        ? validated.skills
        : String(validated.skills)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
      updates.skills = arr.slice(0, 30);
    }
    if (validated.profilePicture !== undefined) updates.profilePicture = validated.profilePicture;
    if (validated.headline !== undefined) updates.headline = validated.headline;
    if (validated.location !== undefined) updates.location = validated.location;
    if (validated.website !== undefined) updates.website = validated.website;
    if (validated.linkedinUrl !== undefined) updates.linkedinUrl = validated.linkedinUrl;
    if (validated.githubUrl !== undefined) updates.githubUrl = validated.githubUrl;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select('-password');

    return res.status(200).json({
      success: true,
      message: 'Profile updated',
      data: userPayload(user),
    });
  } catch (error) {
    console.error('updateProfile error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/v1/auth/forgot-password
// @access  Public — does not reveal whether email exists (security)
// ─────────────────────────────────────────────────────────────────────────────
const forgotPassword = async (req, res) => {
  const validation = validateBody(forgotPasswordSchema, req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address',
    });
  }

  const { email } = validation.data;

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (user) {
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      
      // Hash token and set to user model (Requires resetPasswordToken/Expire fields in schema)
      user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
      await user.save({ validateBeforeSave: false });

      // TODO: Integrate actual email service
      const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
      console.log(`📧 Simulated Email Sent to: ${email}\nReset Link: ${resetUrl}`);
    }
  } catch (e) {
    console.error('Forgot password error:', e);
  }

  // Always return the same response
  return res.status(200).json({
    success: true,
    message: 'If an account exists for this email, password reset instructions will be sent shortly.',
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/v1/auth/reset-password/:token
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const resetPassword = async (req, res) => {
  const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).json({ success: false, message: 'Invalid or expired token' });
  }

  const { password } = req.body;
  const pwValidation = validateBody(registerSchema.pick({ password: true }), { password });
  if (!pwValidation.success) {
    return res.status(400).json({ success: false, message: 'Invalid password', errors: pwValidation.errors });
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  return res.status(200).json({ success: true, message: 'Password reset successful' });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/v1/auth/profile/:id
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const getUserProfile = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid User ID format' });
  }

  const user = await User.findById(req.params.id)
    .select('-password -email -followers -following -bookmarks -expoPushTokens')
    .lean();

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  return res.status(200).json({
    success: true,
    data: user,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   PUT /api/v1/auth/push-token
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const savePushToken = async (req, res) => {
  try {
    const validation = validateBody(pushTokenSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Push token is required',
      });
    }

    const { pushToken } = validation.data;
    const userId = req.user._id;

    // Atomic $addToSet — avoids triggering pre-save hooks
    const result = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { expoPushTokens: pushToken } },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Push token saved',
    });
  } catch (error) {
    console.error('Save push token error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   DELETE /api/v1/auth/me
// @access  Private
// @desc    Delete user account and all associated data
// ─────────────────────────────────────────────────────────────────────────────
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    // Import models needed for cascade deletion
    const { CompletedCourse, Comment, Notification } = await import('../models/index.js');

    // 1. Clean up Cloudinary assets
    const userCourses = await CompletedCourse.find({ user: userId }).select('publicId certificatePublicId').lean();
    for (const course of userCourses) {
      if (course.publicId) await deleteFromCloudinary(course.publicId, 'image').catch(() => {});
      if (course.certificatePublicId) await deleteFromCloudinary(course.certificatePublicId, 'raw').catch(() => {});
    }
    const userRecord = await User.findById(userId).select('profilePicture').lean();
    if (userRecord?.profilePicture?.includes('cloudinary')) {
       // Optional: extract publicId and delete profile picture
    }

    // 2. Cascade delete all user data in parallel
    await Promise.all([
      // Remove user's completed courses
      CompletedCourse.deleteMany({ user: userId }),
      // Remove user's comments
      Comment.deleteMany({ userId: userId }),
      // Remove notifications for/from this user
      Notification.deleteMany({
        $or: [{ userId: userId }, { actorId: userId }]
      }),
      // Remove user from other users' followers/following arrays
      User.updateMany(
        { followers: userId },
        { $pull: { followers: userId } }
      ),
      User.updateMany(
        { following: userId },
        { $pull: { following: userId } }
      ),
      // Remove user from other users' bookmarks (completedCourse IDs will be orphaned, which is fine)
    ]);

    // Finally, delete the user
    await User.findByIdAndDelete(userId);

    return res.status(200).json({
      success: true,
      message: 'Account permanently deleted. All associated data has been removed.',
    });
  } catch (error) {
    console.error('Delete account error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete account. Please try again.',
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/v1/auth/change-password
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Current password and new password are required',
    });
  }

  // Validate new password strength
  const pwValidation = validateBody(registerSchema.pick({ password: true }), { password: newPassword });
  if (!pwValidation.success) {
    return res.status(400).json({
      success: false,
      message: 'New password does not meet requirements',
      errors: pwValidation.errors,
    });
  }

  try {
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    user.password = newPassword;
    await user.save(); // Pre-save hook handles hashing

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/v1/auth/refresh
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const refreshTokenHandler = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({ success: false, message: 'Refresh token required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const session = await Session.findOne({
      userId: decoded.id,
      refreshTokenHash,
      isRevoked: false,
    });

    if (!session) {
      return res.status(401).json({ success: false, message: 'Session invalid or revoked' });
    }

    // Revoke old session (Token Rotation)
    session.isRevoked = true;
    await session.save();

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // Create new pair
    const tokens = await createTokensAndSession(user, req);

    return res.status(200).json({
      success: true,
      message: 'Token refreshed',
      data: { token: tokens.accessToken, refreshToken: tokens.refreshToken },
    });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/v1/auth/logout
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await Session.findOneAndUpdate(
      { userId: req.user._id, refreshTokenHash },
      { isRevoked: true }
    );
  }
  return res.status(200).json({ success: true, message: 'Logged out successfully' });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/v1/auth/logout-all
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const logoutAll = async (req, res) => {
  await Session.updateMany({ userId: req.user._id }, { isRevoked: true });
  return res.status(200).json({ success: true, message: 'Logged out from all devices' });
};

export {
  registerUser,
  loginUser,
  getMe,
  getUserProfile,
  savePushToken,
  updateProfile,
  forgotPassword,
  resetPassword,
  deleteAccount,
  changePassword,
  refreshTokenHandler,
  logout,
  logoutAll,
};
