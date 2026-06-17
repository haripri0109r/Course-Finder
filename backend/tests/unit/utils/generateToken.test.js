import { generateAccessToken, generateRefreshToken } from '../../../src/utils/generateToken.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

describe('Token Generation Unit Tests', () => {
  const userId = new mongoose.Types.ObjectId().toString();

  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = 'access_secret';
    process.env.JWT_REFRESH_SECRET = 'refresh_secret';
  });

  describe('generateAccessToken', () => {
    it('should generate a unique token with jti', () => {
      const token1 = generateAccessToken(userId);
      const token2 = generateAccessToken(userId);

      expect(token1).not.toBe(token2);

      const decoded1 = jwt.decode(token1);
      const decoded2 = jwt.decode(token2);

      expect(decoded1.jti).toBeDefined();
      expect(decoded2.jti).toBeDefined();
      expect(decoded1.jti).not.toBe(decoded2.jti);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a unique refresh token with jti', () => {
      const token1 = generateRefreshToken(userId);
      const token2 = generateRefreshToken(userId);

      expect(token1).not.toBe(token2);

      const decoded1 = jwt.decode(token1);
      const decoded2 = jwt.decode(token2);

      expect(decoded1.jti).toBeDefined();
      expect(decoded1.jti).not.toBe(decoded2.jti);
    });
  });
});
