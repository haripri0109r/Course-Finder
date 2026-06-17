import request from 'supertest';
import app from '../../app.js';
import { User } from '../../src/models/index.js';
import { createTestUser, getAuthTokens } from '../utils/testHelpers.js';

describe('Push Token Integration Tests', () => {
  let user, tokens;

  beforeEach(async () => {
    user = await createTestUser();
    tokens = await getAuthTokens(user);
  });

  describe('PUT /api/v1/auth/push-token', () => {
    it('should save a valid push token', async () => {
      const res = await request(app)
        .put('/api/v1/auth/push-token')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ pushToken: 'ExponentPushToken[12345]' });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Push token saved');

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.expoPushTokens).toContain('ExponentPushToken[12345]');
    });

    it('should prevent duplicate push tokens (atomic)', async () => {
      await request(app)
        .put('/api/v1/auth/push-token')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ pushToken: 'dup-token' });

      const res = await request(app)
        .put('/api/v1/auth/push-token')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ pushToken: 'dup-token' });

      expect(res.statusCode).toBe(200);
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.expoPushTokens.filter(t => t === 'dup-token').length).toBe(1);
    });

    it('should return 400 for missing token', async () => {
      const res = await request(app)
        .put('/api/v1/auth/push-token')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
    });

    it('should return 403 for suspended user', async () => {
      user.accountStatus = 'SUSPENDED';
      user.suspensionExpiresAt = new Date(Date.now() + 1000000);
      await user.save();

      const res = await request(app)
        .put('/api/v1/auth/push-token')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ pushToken: 'some-token' });

      expect(res.statusCode).toBe(403);
    });
  });
});
