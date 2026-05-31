import { User, Session, CompletedCourse, Comment, Report } from '../../src/models/index.js';
import { generateAccessToken, generateRefreshToken } from '../../src/utils/generateToken.js';
import crypto from 'crypto';

export const createTestUser = async (overrides = {}) => {
  const defaultData = {
    name: 'Test User',
    email: `test${Date.now()}@example.com`,
    password: 'Password123!',
    role: 'USER',
    accountStatus: 'ACTIVE',
  };
  return await User.create({ ...defaultData, ...overrides });
};

export const getAuthTokens = async (user) => {
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  
  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await Session.create({
    userId: user._id,
    refreshTokenHash,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });
  
  return { accessToken, refreshToken };
};

export const createTestCourse = async () => {
  // Mongoose needs Course to exist for populate if schema strictly requires it
  const { Course } = await import('../../src/models/index.js');
  return await Course.create({
    title: 'Test Course DB',
    platform: 'Udemy',
    url: `https://test.com/${Date.now()}`
  });
};

export const createTestPost = async (userId, courseId, overrides = {}) => {
  return await CompletedCourse.create({
    user: userId,
    course: courseId,
    courseTitle: 'Test Course',
    progress: 100,
    isRemoved: false,
    ...overrides
  });
};
