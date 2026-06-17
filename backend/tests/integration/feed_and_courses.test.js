import request from 'supertest';
import app from '../../app.js';
import { CompletedCourse, Course } from '../../src/models/index.js';
import { createTestUser, getAuthTokens, createTestCourse, createTestPost } from '../utils/testHelpers.js';

describe('Feed and Courses Integration Tests', () => {
  let user, tokens;

  beforeEach(async () => {
    user = await createTestUser();
    tokens = await getAuthTokens(user);
  });

  describe('GET /api/v1/posts/feed', () => {
    it('should return recent activity feed', async () => {
      const otherUser = await createTestUser({ email: 'feed@test.com' });
      const course = await createTestCourse();
      await createTestPost(otherUser._id, course._id);

      const res = await request(app)
        .get('/api/v1/posts/feed')
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.posts)).toBe(true);
      expect(res.body.posts.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/v1/completed', () => {
    it('should add a new completed course', async () => {
      const res = await request(app)
        .post('/api/v1/completed')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          title: 'New Integration Course',
          platform: 'Udemy',
          url: 'https://udemy.com/new-course',
          progress: 100,
          rating: 5,
          review: 'Great course!'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.courseTitle).toBe('New Integration Course');
      
      const course = await Course.findOne({ url: 'https://udemy.com/new-course' });
      expect(course).toBeTruthy();
    });

    it('should return 409 when adding duplicate course', async () => {
      const course = await createTestCourse();
      await createTestPost(user._id, course._id, { url: course.url });

      const res = await request(app)
        .post('/api/v1/completed')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          title: course.title,
          platform: course.platform,
          url: course.url
        });

      expect(res.statusCode).toBe(409);
    });
  });

  describe('GET /api/v1/completed/:id', () => {
    it('should return specific completion details', async () => {
      const course = await createTestCourse();
      const post = await createTestPost(user._id, course._id);

      const res = await request(app)
        .get(`/api/v1/completed/${post._id}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.title).toBe(course.title);
    });

    it('should return 404 for non-existent post', async () => {
      const id = new (await import('mongoose')).default.Types.ObjectId();
      const res = await request(app)
        .get(`/api/v1/completed/${id}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /api/v1/completed/:id/like', () => {
    it('should like a post', async () => {
      const course = await createTestCourse();
      const post = await createTestPost(user._id, course._id);

      const res = await request(app)
        .post(`/api/v1/completed/${post._id}/like`)
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.likesCount).toBe(1);
    });

    it('should return 400 when liking already liked post', async () => {
      const course = await createTestCourse();
      const post = await createTestPost(user._id, course._id, { likes: [user._id], likesCount: 1 });

      const res = await request(app)
        .post(`/api/v1/completed/${post._id}/like`)
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/completed/:id/unlike', () => {
    it('should unlike a post', async () => {
      const course = await createTestCourse();
      const post = await createTestPost(user._id, course._id, { likes: [user._id], likesCount: 1 });

      const res = await request(app)
        .post(`/api/v1/completed/${post._id}/unlike`)
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.likesCount).toBe(0);
    });
  });
});
