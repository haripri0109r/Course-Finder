import request from 'supertest';
import app from '../../app.js';
import { createTestUser, getAuthTokens, createTestCourse, createTestPost } from '../utils/testHelpers.js';
import jwt from 'jsonwebtoken';

describe('Security Integration Tests', () => {
  
  it('should enforce rate limits on refresh endpoint', async () => {
    const user = await createTestUser();
    const { refreshToken } = await getAuthTokens(user);

    // Refresh limiter is 10 per 15 minutes. Hit it 11 times.
    let lastStatusCode;
    for (let i = 0; i < 11; i++) {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: "bad_token_to_hit_limit" }); // We just care about hitting the endpoint rate limit, not success logic
      lastStatusCode = res.statusCode;
    }
    
    expect(lastStatusCode).toBe(429);
  });

  it('should separate JWT Access and Refresh secrets', async () => {
    const user = await createTestUser();
    // Manually sign a token using REFRESH secret but try to use it as ACCESS token
    const fakeAccessToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '15m' });
    
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${fakeAccessToken}`);
    
    expect(res.statusCode).toBe(401);
  });

  it('should block BANNED users from all protected routes', async () => {
    const user = await createTestUser({ accountStatus: 'BANNED' });
    const { accessToken } = await getAuthTokens(user);

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/Account banned/i);
  });

  it('should block SUSPENDED users from write actions (enforceNotSuspended)', async () => {
    const user = await createTestUser({ 
      accountStatus: 'SUSPENDED',
      suspensionExpiresAt: new Date(Date.now() + 100000) // Future
    });
    const { accessToken } = await getAuthTokens(user);

    const res = await request(app)
      .post('/api/v1/reports') // uses enforceNotSuspended
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});
    
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/Account suspended/i);
  });

  it('should auto-clear expired suspensions', async () => {
    const user = await createTestUser({ 
      accountStatus: 'SUSPENDED',
      suspensionExpiresAt: new Date(Date.now() - 10000) // Past
    });
    const { accessToken } = await getAuthTokens(user);

    const course = await createTestCourse();
    const post = await createTestPost(user._id, course._id);

    const res = await request(app)
      .post(`/api/v1/completed/${post._id}/like`) // uses enforceNotSuspended
      .set('Authorization', `Bearer ${accessToken}`);
    
    // Should NOT be 403, might be 400 or 200 depending on mock, but NOT 403.
    expect(res.statusCode).not.toBe(403);
  });
});
