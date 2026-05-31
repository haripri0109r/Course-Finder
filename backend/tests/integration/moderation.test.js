import request from 'supertest';
import app from '../../app.js';
import { Report, AdminAuditLog } from '../../src/models/index.js';
import { createTestUser, getAuthTokens, createTestCourse, createTestPost } from '../utils/testHelpers.js';
import mongoose from 'mongoose';

describe('Moderation Integration Tests', () => {
  let modTokens, userTokens, user, course, post;

  beforeAll(async () => {
    const mod = await createTestUser({ role: 'MODERATOR' });
    user = await createTestUser({ role: 'USER' });
    modTokens = await getAuthTokens(mod);
    userTokens = await getAuthTokens(user);
    
    course = await createTestCourse();
    post = await createTestPost(user._id, course._id);
  });

  it('should validate report targets exist before creation', async () => {
    const invalidId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${userTokens.accessToken}`)
      .send({
        targetType: 'POST',
        targetId: invalidId,
        category: 'Spam'
      });
    expect(res.statusCode).toBe(404);
  });

  it('should successfully create a report and prevent duplicates', async () => {
    const res1 = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${userTokens.accessToken}`)
      .send({
        targetType: 'POST',
        targetId: post._id,
        category: 'Spam',
        reason: 'Looks like spam'
      });
    expect(res1.statusCode).toBe(201);

    const res2 = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${userTokens.accessToken}`)
      .send({
        targetType: 'POST',
        targetId: post._id,
        category: 'Spam'
      });
    expect(res2.statusCode).toBe(400); // duplicate prevention
  });

  it('should let a moderator resolve a report', async () => {
    const report = await Report.create({
      reporterId: user._id,
      targetType: 'POST',
      targetId: post._id,
      category: 'Harassment',
      status: 'OPEN'
    });

    const res = await request(app)
      .put(`/api/v1/moderation/reports/${report._id}/status`)
      .set('Authorization', `Bearer ${modTokens.accessToken}`)
      .send({
        status: 'RESOLVED',
        resolutionNotes: 'Removed post'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('RESOLVED');
  });

  it('should allow moderator to remove content and create audit log', async () => {
    const res = await request(app)
      .put(`/api/v1/moderation/content/post/${post._id}/status`)
      .set('Authorization', `Bearer ${modTokens.accessToken}`)
      .send({
        isRemoved: true,
        removalReason: 'Spam'
      });

    expect(res.statusCode).toBe(200);

    const log = await AdminAuditLog.findOne({ targetId: post._id, action: 'REMOVE_CONTENT' });
    expect(log).toBeTruthy();
    expect(log.targetType).toBe('POST');
  });

  it('should allow moderator to restore content', async () => {
    const res = await request(app)
      .put(`/api/v1/moderation/content/post/${post._id}/status`)
      .set('Authorization', `Bearer ${modTokens.accessToken}`)
      .send({
        isRemoved: false
      });

    expect(res.statusCode).toBe(200);

    const log = await AdminAuditLog.findOne({ targetId: post._id, action: 'RESTORE_CONTENT' });
    expect(log).toBeTruthy();
  });
});
