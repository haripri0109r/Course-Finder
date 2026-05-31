import request from 'supertest';
import app from '../../app.js';
import { User, Session } from '../../src/models/index.js';
import { createTestUser, getAuthTokens } from '../utils/testHelpers.js';

describe('Admin Integration Tests', () => {
  let adminTokens, adminUser, superAdminTokens;

  beforeAll(async () => {
    adminUser = await createTestUser({ role: 'ADMIN' });
    adminTokens = await getAuthTokens(adminUser);
    
    const superAdmin = await createTestUser({ role: 'SUPER_ADMIN' });
    superAdminTokens = await getAuthTokens(superAdmin);
  });

  it('should list users with pagination and search', async () => {
    await createTestUser({ name: 'FindMeUser' });

    const res = await request(app)
      .get('/api/v1/admin/users?search=FindMeUser')
      .set('Authorization', `Bearer ${adminTokens.accessToken}`);
    
    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].name).toBe('FindMeUser');
  });

  it('should access analytics', async () => {
    const res = await request(app)
      .get('/api/v1/admin/analytics')
      .set('Authorization', `Bearer ${adminTokens.accessToken}`);
    
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('totalUsers');
    expect(res.body.data).toHaveProperty('activeUsers');
  });

  it('should suspend a user', async () => {
    const user = await createTestUser();
    
    const res = await request(app)
      .put(`/api/v1/admin/users/${user._id}/status`)
      .set('Authorization', `Bearer ${adminTokens.accessToken}`)
      .send({ status: 'SUSPENDED', durationDays: 3 });
    
    expect(res.statusCode).toBe(200);

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.accountStatus).toBe('SUSPENDED');
    expect(updatedUser.suspensionExpiresAt).toBeTruthy();
  });

  it('should ban a user and revoke their sessions', async () => {
    const user = await createTestUser();
    await getAuthTokens(user); // creates a session

    const res = await request(app)
      .put(`/api/v1/admin/users/${user._id}/status`)
      .set('Authorization', `Bearer ${adminTokens.accessToken}`)
      .send({ status: 'BANNED' });
    
    expect(res.statusCode).toBe(200);

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.accountStatus).toBe('BANNED');

    const sessions = await Session.find({ userId: user._id, isRevoked: false });
    expect(sessions.length).toBe(0); // All sessions should be revoked
  });

  it('should change user role (Super Admin)', async () => {
    const user = await createTestUser();
    const res = await request(app)
      .put(`/api/v1/admin/users/${user._id}/role`)
      .set('Authorization', `Bearer ${superAdminTokens.accessToken}`)
      .send({ role: 'MODERATOR' });
    
    expect(res.statusCode).toBe(200);
    
    const updatedUser = await User.findById(user._id);
    expect(updatedUser.role).toBe('MODERATOR');
  });
});
