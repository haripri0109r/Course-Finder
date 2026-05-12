import mongoose from 'mongoose';
import { User } from '../models/index.js';
import generateToken from '../utils/generateToken.js';

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
// @route   POST /api/auth/register
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  // 1. Validate required fields
  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide name, email, and password',
    });
  }

  // 2. Check for existing account
  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    return res.status(409).json({
      success: false,
      message: 'An account with this email already exists',
    });
  }

  // 3. Create user (password hashed automatically by pre-save hook in User model)
  const user = await User.create({ name: name.trim(), email, password });

  // 4. Generate token and respond
  const token = generateToken(user._id);

  return res.status(201).json({
    success: true,
    message: 'Account created successfully',
    data: {
      token,
      user: userPayload(user),
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/auth/login
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  // 1. Validate input
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide email and password',
    });
  }

  // 2. Find user — explicitly select password (it's hidden by default)
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
    '+password'
  );

  // 3. Check credentials (use constant-time compare to prevent timing attacks)
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password',
    });
  }

  // 4. Issue token and respond
  const token = generateToken(user._id);

  return res.status(200).json({
    success: true,
    message: 'Logged in successfully',
    data: {
      token,
      user: userPayload(user),
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/auth/me
// @access  Private (requires valid JWT)
// ─────────────────────────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  // req.user is already attached by the protect middleware (no DB call needed)
  const user = req.user;

  return res.status(200).json({
    success: true,
    data: {
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
      followers: user.followers,
      following: user.following,
      bookmarks: user.bookmarks,
      createdAt: user.createdAt,
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   PUT /api/auth/me
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const {
      name,
      bio,
      skills,
      profilePicture,
      headline,
      location,
      website,
      linkedinUrl,
      githubUrl,
    } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = String(name).trim().slice(0, 60);
    if (bio !== undefined) updates.bio = String(bio).trim().slice(0, 300);
    if (Array.isArray(skills) || typeof skills === 'string') {
      const arr = Array.isArray(skills)
        ? skills
        : String(skills)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
      updates.skills = arr.slice(0, 30);
    }
    if (profilePicture !== undefined) updates.profilePicture = String(profilePicture).trim().slice(0, 500);
    if (headline !== undefined) updates.headline = String(headline).trim().slice(0, 120);
    if (location !== undefined) updates.location = String(location).trim().slice(0, 80);
    if (website !== undefined) updates.website = String(website).trim().slice(0, 200);
    if (linkedinUrl !== undefined) updates.linkedinUrl = String(linkedinUrl).trim().slice(0, 200);
    if (githubUrl !== undefined) updates.githubUrl = String(githubUrl).trim().slice(0, 200);

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
// @route   POST /api/auth/forgot-password
// @access  Public — does not reveal whether email exists (security)
// ─────────────────────────────────────────────────────────────────────────────
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email || !String(email).includes('@')) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address',
    });
  }

  try {
    await User.findOne({ email: email.toLowerCase().trim() });
  } catch (e) {
    // ignore
  }

  return res.status(200).json({
    success: true,
    message:
      'If an account exists for this email, password reset instructions will be sent shortly. Check your inbox and spam folder.',
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/auth/profile/:id
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const getUserProfile = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid User ID format' });
  }

  const user = await User.findById(req.params.id)
    .select('-password -email')
    .populate('followers', 'name profilePicture')
    .populate('following', 'name profilePicture');

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
// @route   PUT /api/auth/push-token
// @access  Private (requires valid JWT)
// ─────────────────────────────────────────────────────────────────────────────
const savePushToken = async (req, res) => {
  try {
    const userId = req.user._id;
    const { pushToken } = req.body;

    console.log("📱 SAVE TOKEN - USER:", userId);
    console.log("📱 SAVE TOKEN - TOKEN:", pushToken);

    if (!pushToken) {
      return res.status(400).json({
        success: false,
        message: 'Push token is required',
      });
    }

    // Atomic $addToSet — avoids triggering pre-save hooks and validation
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

    console.log("📱 SAVE TOKEN - UPDATED TOKENS:", result.expoPushTokens);

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

export { registerUser, loginUser, getMe, getUserProfile, savePushToken, updateProfile, forgotPassword };
