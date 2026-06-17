import { jest } from '@jest/globals';

// Mock email service
jest.unstable_mockModule('../../src/services/emailService.js', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true)
}));

const request = (await import('supertest')).default;
const app = (await import('../../app.js')).default;
const { User, Session } = await import('../../src/models/index.js');
const { createTestUser, getAuthTokens } = await import('../utils/testHelpers.js');
const crypto = (await import('crypto')).default;

describe('Auth Lifecycle & Sessions Integration Tests', () => {
  let user, tokens;

  beforeEach(async () => {
    user = await createTestUser();
    tokens = await getAuthTokens(user);
    jest.clearAllMocks();
  });

  describe('Email Verification', () => {
    it('should register a user, set emailVerified to false, and send verification email', async () => {
      const emailService = await import('../../src/services/emailService.js');
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'New User',
          email: 'newuser@test.com',
          password: 'Password123!'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.user.emailVerified).toBe(false);
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith('newuser@test.com', expect.any(String));
      
      const savedUser = await User.findOne({ email: 'newuser@test.com' });
      expect(savedUser.emailVerificationToken).toBeDefined();
    });

    it('should verify email with valid token', async () => {
      const token = 'my-token';
      const hash = crypto.createHash('sha256').update(token).digest('hex');
      user.emailVerified = false;
      user.emailVerificationToken = hash;
      user.emailVerificationExpire = Date.now() + 100000;
      await user.save();

      const res = await request(app)
        .post(`/api/v1/auth/verify-email/${token}`);

      expect(res.statusCode).toBe(200);
      
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.emailVerified).toBe(true);
      expect(updatedUser.emailVerificationToken).toBeUndefined();
    });

    it('should allow resending verification email', async () => {
      const emailService = await import('../../src/services/emailService.js');
      user.emailVerified = false;
      await user.save();

      const res = await request(app)
        .post('/api/v1/auth/resend-verification')
        .send({ email: user.email });

      expect(res.statusCode).toBe(200);
      expect(emailService.sendVerificationEmail).toHaveBeenCalled();
    });
  });

  describe('Active Sessions', () => {
    it('should list active sessions', async () => {
      const res = await request(app)
        .get('/api/v1/auth/sessions')
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0]).toHaveProperty('deviceInfo');
      expect(res.body.data[0]).toHaveProperty('ipAddress');
    });

    it('should revoke a specific session', async () => {
      const sessions = await Session.find({ userId: user._id });
      const sessionId = sessions[0]._id;

      const res = await request(app)
        .delete(`/api/v1/auth/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expect(res.statusCode).toBe(200);

      const revokedSession = await Session.findById(sessionId);
      expect(revokedSession.isRevoked).toBe(true);
    });
  });
});
