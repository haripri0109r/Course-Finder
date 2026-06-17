import request from 'supertest';
import app from '../../app.js';
import { Comment, CompletedCourse } from '../../src/models/index.js';
import { createTestUser, getAuthTokens, createTestCourse, createTestPost } from '../utils/testHelpers.js';
import mongoose from 'mongoose';

describe('Comments Integration Tests', () => {
  let user, tokens, post;

  beforeEach(async () => {
    user = await createTestUser();
    tokens = await getAuthTokens(user);
    const course = await createTestCourse();
    post = await createTestPost(user._id, course._id);
  });

  describe('POST /api/v1/comments', () => {
    it('should add a comment to a post', async () => {
      const res = await request(app)
        .post('/api/v1/comments')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          postId: post._id,
          text: 'Great insights!'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.text).toBe('Great insights!');
      expect(res.body.userId.name).toBe(user.name);

      const updatedPost = await CompletedCourse.findById(post._id);
      expect(updatedPost.commentCount).toBe(1);
    });

    it('should add a reply to a comment', async () => {
      const parentComment = await Comment.create({
        postId: post._id,
        userId: user._id,
        text: 'Initial comment'
      });

      const res = await request(app)
        .post('/api/v1/comments')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          postId: post._id,
          parentId: parentComment._id,
          text: 'Thanks for sharing!'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.parentId.toString()).toBe(parentComment._id.toString());
    });

    it('should return 400 for max depth (2 levels)', async () => {
       const parent = await Comment.create({ postId: post._id, userId: user._id, text: 'P' });
       const reply = await Comment.create({ postId: post._id, userId: user._id, text: 'R', parentId: parent._id });

       const res = await request(app)
        .post('/api/v1/comments')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          postId: post._id,
          parentId: reply._id,
          text: 'Too deep'
        });

       expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/comments/:postId', () => {
    it('should return threaded comments for a post', async () => {
      await Comment.create({ postId: post._id, userId: user._id, text: 'C1' });
      
      const res = await request(app)
        .get(`/api/v1/comments/${post._id}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.comments.length).toBe(1);
    });
  });

  describe('POST /api/v1/comments/:id/like', () => {
    it('should toggle like on a comment', async () => {
      const comment = await Comment.create({ postId: post._id, userId: user._id, text: 'Like me' });

      const res = await request(app)
        .post(`/api/v1/comments/${comment._id}/like`)
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.likesCount).toBe(1);

      // Toggle off
      const res2 = await request(app)
        .post(`/api/v1/comments/${comment._id}/like`)
        .set('Authorization', `Bearer ${tokens.accessToken}`);
      
      expect(res2.statusCode).toBe(200);
      expect(res2.body.likesCount).toBe(0);
    });
  });
});
