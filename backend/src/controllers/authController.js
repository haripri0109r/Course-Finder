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
      followers: user.followers,
      following: user.following,
      bookmarks: user.bookmarks,
      createdAt: user.createdAt,
    },
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

export { registerUser, loginUser, getMe, getUserProfile };
