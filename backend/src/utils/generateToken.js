import jwt from 'jsonwebtoken';

/**
 * Signs and returns a short-lived Access JWT for a given user ID.
 * @param {string} id - MongoDB user _id
 * @returns {string} signed access token
 */
export const generateAccessToken = (id) => {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET is not defined in environment variables');
  }
  return jwt.sign({ id }, secret, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  });
};

/**
 * Signs and returns a long-lived Refresh JWT for a given user ID.
 * @param {string} id - MongoDB user _id
 * @returns {string} signed refresh token
 */
export const generateRefreshToken = (id) => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET is not defined in environment variables');
  }
  return jwt.sign({ id }, secret, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
};

// Default export for backward compatibility where needed
export default generateAccessToken;
