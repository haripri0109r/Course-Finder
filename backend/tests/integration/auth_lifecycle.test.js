import request from 'supertest';
import app from '../../app.js';
import { User, Session } from '../../src/models/index.js';
import { createTestUser, getAuthTokens } from '../utils/testHelpers.js';
import crypto from 'crypto';

describe('Auth Lifecycle Integration Tests', () => {
  let user, tokens;

  beforeEach(async () => {
    user = await createTestUser();
    tokens = await getAuthTokens(user);
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    it('should return 200 regardless of whether email exists', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: user.email });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch(/password reset instructions will be sent/i);

      const resNonExistent = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent@test.com' });
      
      expect(resNonExistent.statusCode).toBe(200);
    });

    it('should return 400 for invalid email format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'invalid-email' });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/auth/reset-password/:token', () => {
    it('should reset password and revoke all sessions', async () => {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      
      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpire = Date.now() + 3600000;
      await user.save();

      const res = await request(app)
        .post(`/api/v1/auth/reset-password/${resetToken}`)
        .send({ password: 'NewSecurePassword123!' });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch(/All previous sessions have been logged out/i);

      // Verify sessions revoked
      const activeSessions = await Session.find({ userId: user._id, isRevoked: false });
      expect(activeSessions.length).toBe(0);

      // Verify login works with new password
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: 'NewSecurePassword123!' });
      expect(loginRes.statusCode).toBe(200);
    });

    it('should return 400 for expired or invalid token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password/invalid-token')
        .send({ password: 'NewPassword123!' });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/auth/change-password', () => {
    it('should change password and revoke other sessions', async () => {
      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          currentPassword: 'Password123!',
          newPassword: 'BrandNewPassword123!'
        });

      expect(res.statusCode).toBe(200);
      
      const activeSessions = await Session.find({ userId: user._id, isRevoked: false });
      expect(activeSessions.length).toBe(0);
    });

    it('should return 401 for incorrect current password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          currentPassword: 'WrongPassword',
          newPassword: 'NewPassword123!'
        });

      expect(res.statusCode).toBe(401);
    });

    it('should return 400 for weak new password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          currentPassword: 'Password123!',
          newPassword: 'short'
        });

      expect(res.statusCode).toBe(400);
    });
  });
});
