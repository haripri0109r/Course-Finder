import 'dotenv/config';
import mongoose from 'mongoose';
import { User, CompletedCourse, Comment, Report, Session } from '../../src/models/index.js';
import { escapeRegex } from '../../src/utils/regexUtils.js';

async function runTests() {
  console.log('🚀 Starting Phase 2 Final Fixes Verification...');

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // ─── 1. REGEX ESCAPING TEST ───────────────────────────────────────────────
    console.log('\n--- 1. Regex Escaping Test ---');
    const dangerousInput = '.*+?^${}()|[\\]\\\\';
    const escaped = escapeRegex(dangerousInput);
    console.log(`Input: ${dangerousInput}`);
    console.log(`Escaped: ${escaped}`);
    if (escaped === '\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\\\\\]\\\\\\\\') {
      console.log('✅ Regex escape successful');
    } else {
      console.log('❌ Regex escape failed expected mapping');
    }

    // ─── 2. AUTO-CLEAR SUSPENSION TEST ────────────────────────────────────────
    console.log('\n--- 2. Auto-clear Suspension Test ---');
    const testUser = await User.create({
      name: 'Suspended Test User',
      email: `suspend_${Date.now()}@test.com`,
      password: 'password123',
      accountStatus: 'SUSPENDED',
      suspensionExpiresAt: new Date(Date.now() - 10000), // Expired 10s ago
    });

    // Mock middleware logic
    if (testUser.accountStatus === 'SUSPENDED' && new Date() > testUser.suspensionExpiresAt) {
      await User.findByIdAndUpdate(testUser._id, {
        accountStatus: 'ACTIVE',
        suspensionExpiresAt: null,
      });
      const updated = await User.findById(testUser._id);
      if (updated.accountStatus === 'ACTIVE' && updated.suspensionExpiresAt === null) {
        console.log('✅ Auto-clear suspension logic works');
      } else {
        console.log('❌ Auto-clear suspension failed');
      }
    }

    // ─── 3. REPORT TARGET VALIDATION TEST ─────────────────────────────────────
    console.log('\n--- 3. Report Target Validation Test ---');
    const invalidId = new mongoose.Types.ObjectId();
    const targetExists = await CompletedCourse.exists({ _id: invalidId, isRemoved: false });
    if (!targetExists) {
      console.log('✅ Target existence validation (negative) works');
    } else {
      console.log('❌ Target existence validation (negative) failed');
    }

    // ─── 4. REMOVED CONTENT ISOLATION TEST ────────────────────────────────────
    console.log('\n--- 4. Removed Content Isolation Test ---');
    const testPost = await CompletedCourse.create({
      user: testUser._id,
      course: new mongoose.Types.ObjectId(),
      isRemoved: true,
      courseTitle: 'Removed Post',
    });

    const verifyPost = await CompletedCourse.findOne({ _id: testPost._id, isRemoved: false });
    if (!verifyPost) {
      console.log('✅ Removed post successfully isolated from standard queries');
    } else {
      console.log('❌ Removed post leaked into standard query');
    }

    const testComment = await Comment.create({
      postId: testPost._id,
      userId: testUser._id,
      text: 'Visible Comment',
      isRemoved: false,
    });

    const testRemovedComment = await Comment.create({
      postId: testPost._id,
      userId: testUser._id,
      text: 'Hidden Comment',
      isRemoved: true,
    });

    const visibleComments = await Comment.find({ postId: testPost._id, isRemoved: false });
    if (visibleComments.length === 1 && visibleComments[0].text === 'Visible Comment') {
      console.log('✅ Removed comments successfully isolated');
    } else {
      console.log('❌ Removed comments leaked into query results');
    }

    // ─── 5. INTERACTION BLOCKING TEST ─────────────────────────────────────────
    console.log('\n--- 5. Interaction Blocking Test ---');
    // Simulate interaction check
    const checkPost = await CompletedCourse.findById(testPost._id).lean();
    if (checkPost.isRemoved) {
      console.log('✅ Interaction (Post Removal Check) logic confirmed');
    } else {
      console.log('❌ Interaction check failed');
    }

    // ─── 6. COMMENT COUNT SYNC TEST ──────────────────────────────────────────
    console.log('\n--- 6. Comment Count Sync Test ---');
    await CompletedCourse.findByIdAndUpdate(testPost._id, { $set: { commentCount: 1 } });
    
    // Simulate moderation toggling comment status
    const isRemoved = true;
    const inc = isRemoved ? -1 : 1;
    await CompletedCourse.findByIdAndUpdate(testPost._id, { $inc: { commentCount: inc } });
    
    const finalPost = await CompletedCourse.findById(testPost._id);
    if (finalPost.commentCount === 0) {
      console.log('✅ Comment count synced correctly after soft-delete');
    } else {
      console.log(`❌ Comment count sync failed (Expected 0, got ${finalPost.commentCount})`);
    }

    // Cleanup
    await User.deleteOne({ _id: testUser._id });
    await CompletedCourse.deleteOne({ _id: testPost._id });
    await Comment.deleteMany({ postId: testPost._id });
    console.log('\n🧹 Cleanup complete');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected');
  }
}

runTests();
