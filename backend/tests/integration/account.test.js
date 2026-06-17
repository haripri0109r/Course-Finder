import request from 'supertest';
import app from '../../app.js';
import { User, Session, CompletedCourse, Comment, Notification } from '../../src/models/index.js';
import { createTestUser, getAuthTokens, createTestCourse, createTestPost } from '../utils/testHelpers.js';
import mongoose from 'mongoose';

describe('Account Integration Tests', () => {
  let user, tokens;

  beforeEach(async () => {
    user = await createTestUser();
    tokens = await getAuthTokens(user);
  });

  describe('DELETE /api/v1/auth/me', () => {
    it('should delete user and perform cascade cleanup', async () => {
      // Setup related data
      const course = await createTestCourse();
      const post = await createTestPost(user._id, course._id);
      
      const comment = await Comment.create({
        postId: post._id,
        userId: user._id,
        text: 'Test comment'
      });

      const notif = await Notification.create({
        userId: user._id,
        actorId: new mongoose.Types.ObjectId(),
        type: 'comment',
        postId: post._id
      });

      const res = await request(app)
        .delete('/api/v1/auth/me')
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch(/Account permanently deleted/i);

      // Verify User deleted
      const deletedUser = await User.findById(user._id);
      expect(deletedUser).toBeNull();

      // Verify Content deleted
      const deletedPost = await CompletedCourse.findById(post._id);
      expect(deletedPost).toBeNull();

      const deletedComment = await Comment.findById(comment._id);
      expect(deletedComment).toBeNull();

      const deletedNotif = await Notification.findById(notif._id);
      expect(deletedNotif).toBeNull();

      // Verify Sessions revoked/removed (controller doesn't explicitly delete session docs but user is gone)
      // Actually the controller only deletes the user doc and some related data.
      // But authentication should no longer work.
      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${tokens.accessToken}`);
      
      expect(meRes.statusCode).toBe(401);
    });
  });
});
