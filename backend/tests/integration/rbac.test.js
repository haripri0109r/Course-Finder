import request from 'supertest';
import app from '../../app.js';
import { createTestUser, getAuthTokens } from '../utils/testHelpers.js';

describe('RBAC Integration Tests', () => {
  let userTokens, modTokens, adminTokens, superAdminTokens;

  beforeAll(async () => {
    const user = await createTestUser({ role: 'USER' });
    const mod = await createTestUser({ role: 'MODERATOR' });
    const admin = await createTestUser({ role: 'ADMIN' });
    const superAdmin = await createTestUser({ role: 'SUPER_ADMIN' });

    userTokens = await getAuthTokens(user);
    modTokens = await getAuthTokens(mod);
    adminTokens = await getAuthTokens(admin);
    superAdminTokens = await getAuthTokens(superAdmin);
  });

  describe('USER Role', () => {
    it('cannot access moderation routes', async () => {
      const res = await request(app)
        .get('/api/v1/moderation/reports')
        .set('Authorization', `Bearer ${userTokens.accessToken}`);
      expect(res.statusCode).toBe(403);
    });

    it('cannot access admin routes', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${userTokens.accessToken}`);
      expect(res.statusCode).toBe(403);
    });
  });

  describe('MODERATOR Role', () => {
    it('can access moderation routes', async () => {
      const res = await request(app)
        .get('/api/v1/moderation/reports')
        .set('Authorization', `Bearer ${modTokens.accessToken}`);
      expect(res.statusCode).toBe(200);
    });

    it('cannot access admin routes', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${modTokens.accessToken}`);
      expect(res.statusCode).toBe(403);
    });
  });

  describe('ADMIN Role', () => {
    it('can access admin routes', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`);
      expect(res.statusCode).toBe(200);
    });

    it('cannot assign roles', async () => {
      const user = await createTestUser();
      const res = await request(app)
        .put(`/api/v1/admin/users/${user._id}/role`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`)
        .send({ role: 'MODERATOR' });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('SUPER_ADMIN Role', () => {
    it('can assign roles', async () => {
      const user = await createTestUser();
      const res = await request(app)
        .put(`/api/v1/admin/users/${user._id}/role`)
        .set('Authorization', `Bearer ${superAdminTokens.accessToken}`)
        .send({ role: 'MODERATOR' });
      expect(res.statusCode).toBe(200);
    });
  });
});
