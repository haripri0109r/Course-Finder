import request from 'supertest';
import app from '../../app.js';
import { User, CompletedCourse } from '../../src/models/index.js';
import { createTestUser, getAuthTokens, createTestPost, createTestCourse } from '../utils/testHelpers.js';

describe('Profile Integration Tests', () => {
  let user, tokens;

  beforeEach(async () => {
    user = await createTestUser();
    tokens = await getAuthTokens(user);
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user profile with synthesized bookmarks', async () => {
      // Mock bookmarks
      const { Bookmark } = await import('../../src/models/index.js');
      await Bookmark.create({ userId: user._id, courseId: new (await import('mongoose')).default.Types.ObjectId() });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(user.email);
      expect(Array.isArray(res.body.data.bookmarks)).toBe(true);
      expect(res.body.data.bookmarks.length).toBe(1);
    });

    it('should return 401 if unauthorized', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.statusCode).toBe(401);
    });
  });

  describe('PUT /api/v1/auth/me', () => {
    it('should update user profile fields', async () => {
      const res = await request(app)
        .put('/api/v1/auth/me')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          name: 'Updated Name',
          bio: 'New Bio',
          skills: 'react, jest, node'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.name).toBe('Updated Name');
      expect(res.body.data.bio).toBe('New Bio');
      expect(res.body.data.skills).toContain('react');
      
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.name).toBe('Updated Name');
      expect(updatedUser.skills.length).toBe(3);
    });

    it('should accept skills as an array', async () => {
      const res = await request(app)
        .put('/api/v1/auth/me')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          skills: ['express', 'mongodb']
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.skills).toEqual(['express', 'mongodb']);
    });

    it('should return 400 for invalid fields', async () => {
      const res = await request(app)
        .put('/api/v1/auth/me')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          invalidField: 'value'
        });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/auth/profile/:id', () => {
    it('should return public profile for a user', async () => {
      const otherUser = await createTestUser({ email: 'other@test.com' });
      
      const res = await request(app)
        .get(`/api/v1/auth/profile/${otherUser._id}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.name).toBe(otherUser.name);
      expect(res.body.data).not.toHaveProperty('email');
      expect(res.body.data).not.toHaveProperty('password');
    });

    it('should return 400 for invalid ID format', async () => {
      const res = await request(app)
        .get('/api/v1/auth/profile/invalid-id')
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expect(res.statusCode).toBe(400);
    });

    it('should return 404 for non-existent user', async () => {
      const id = new (await import('mongoose')).default.Types.ObjectId();
      const res = await request(app)
        .get(`/api/v1/auth/profile/${id}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expect(res.statusCode).toBe(404);
    });
  });
});
