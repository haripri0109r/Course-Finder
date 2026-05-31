import request from 'supertest';
import app from '../../app.js';
import { User, Session } from '../../src/models/index.js';
import { createTestUser, getAuthTokens } from '../utils/testHelpers.js';
import jwt from 'jsonwebtoken';

describe('Auth Integration Tests', () => {
  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123!'
      });
    
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data.user.email).toBe('john@example.com');
  });

  it('should login an existing user', async () => {
    await createTestUser({ email: 'login@example.com', password: 'Password123!' });
    
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'login@example.com',
        password: 'Password123!'
      });
    
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data).toHaveProperty('refreshToken');
  });

  it('should refresh token and rotate session', async () => {
    const user = await createTestUser();
    const { refreshToken } = await getAuthTokens(user);

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data.refreshToken).not.toBe(refreshToken);
    
    // Attempt to reuse old refresh token (should fail)
    const res2 = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });
    expect(res2.statusCode).toBe(401);
  });

  it('should logout a user and invalidate specific session', async () => {
    const user = await createTestUser();
    const { accessToken, refreshToken } = await getAuthTokens(user);

    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken });
    
    expect(res.statusCode).toBe(200);

    // Refresh should fail
    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });
    expect(refreshRes.statusCode).toBe(401);
  });

  it('should logout from all devices', async () => {
    const user = await createTestUser();
    const tokens1 = await getAuthTokens(user);
    const tokens2 = await getAuthTokens(user);

    const res = await request(app)
      .post('/api/v1/auth/logout-all')
      .set('Authorization', `Bearer ${tokens1.accessToken}`);
    
    expect(res.statusCode).toBe(200);

    const refresh1 = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: tokens1.refreshToken });
    const refresh2 = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: tokens2.refreshToken });
    
    expect(refresh1.statusCode).toBe(401);
    expect(refresh2.statusCode).toBe(401);
  });

  it('should revoke sessions on password change', async () => {
    const user = await createTestUser({ password: 'OldPassword123!' });
    const { accessToken, refreshToken } = await getAuthTokens(user);

    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!'
      });

    expect(res.statusCode).toBe(200);

    // Check if session was revoked
    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });
    expect(refreshRes.statusCode).toBe(401);
  });

  it('should validate JWT explicitly (401 on bad token)', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid_token');
    
    expect(res.statusCode).toBe(401);
  });
});
