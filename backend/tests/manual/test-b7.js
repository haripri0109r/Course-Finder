import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { getSmartFeed } from '../../src/services/feedService.js';
import { refreshUserProfile } from '../../src/services/interestProfilingService.js';
import { refreshTrendingCache } from '../../src/services/trendingService.js';
import { trackEvent } from '../../src/services/activityService.js';
import { User, Course, CompletedCourse, ActivityEvent, UserPersonalization, TrendingPost, CacheControl } from '../../src/models/index.js';

dotenv.config();

const testB7Hardened = async () => {
  try {
    console.log('--- Starting B7.2 Reliability Hardening Validation ---');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Setup Test Users
    const cleanUser = async (email) => {
      const u = await User.findOne({ email });
      if (u) {
        await CompletedCourse.deleteMany({ user: u._id });
        await ActivityEvent.deleteMany({ userId: u._id });
        await UserPersonalization.deleteOne({ userId: u._id });
        await User.deleteOne({ _id: u._id });
      }
    };

    const emails = ['b7_user@example.com', 'b7_creator@example.com', 'b7_muted@example.com', 'hardened_user@example.com'];
    for (const email of emails) await cleanUser(email);

    const createUser = async (name, email) => await User.create({ name, email, password: 'password123' });

    const targetUser = await createUser('Hardened User', 'hardened_user@example.com');
    const creator = await createUser('Prolific Creator', 'b7_creator@example.com');

    // 2. Concurrency & Atomicity Simulation
    console.log('\n--- TESTING CONCURRENCY & ATOMICITY ---');
    
    // Simulating simultaneous events for same topic
    console.log('Simulating 20 simultaneous writes for "concurrent_topic"...');
    const concurrentWrites = [];
    for (let i = 0; i < 20; i++) {
      concurrentWrites.push(trackEvent({
        userId: targetUser._id,
        eventType: 'search_query',
        metadata: { query: 'concurrent_topic' }
      }));
    }
    await Promise.all(concurrentWrites);
    
    // Give TaskQueue time to drain
    console.log('Waiting for TaskQueue to process...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const profile = await UserPersonalization.findOne({ userId: targetUser._id }).lean();
    const concurrentEntries = profile.interests.filter(i => i.topic === 'concurrent_topic');
    console.log(`Entries for "concurrent_topic": ${concurrentEntries.length}`);
    if (concurrentEntries.length === 1) {
      console.log('✅ PASS: Atomic profiling prevents duplicate array entries');
    } else {
      console.log('❌ FAIL: Race condition caused duplicate array entries');
    }

    // 3. Short-term Interest Aging
    console.log('\n--- TESTING SHORT-TERM INTEREST AGING ---');
    // Artificially age an entry
    await UserPersonalization.updateOne(
      { userId: targetUser._id, 'shortTermInterests.topic': 'concurrent_topic' },
      { $set: { 'shortTermInterests.$.lastUpdated': new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) } }
    );
    
    const agedProfile = await (await import('../../src/services/interestProfilingService.js')).getPersonalizedProfile(targetUser._id);
    const hasAged = agedProfile.shortTermInterests.some(i => i.topic === 'concurrent_topic');
    if (!hasAged) {
      console.log('✅ PASS: Short-term intent correctly aged out at read-time');
    } else {
      console.log('❌ FAIL: Aged intent still present');
    }

    // 4. Atomic Pointer Swap (Trending Cache)
    console.log('\n--- TESTING ATOMIC POINTER SWAP ---');
    // Create some content for trending
    const course = await Course.create({
      title: 'Trending Course', platform: 'Udemy', url: `https://trend-${Date.now()}`,
      tags: ['js'], averageRating: 4.5, totalCompletions: 1000
    });
    await CompletedCourse.create({ user: creator._id, course: course._id, isPublic: true, viewsCount: 100 });

    await refreshTrendingCache();
    const pointer1 = await CacheControl.findOne({ key: 'trending_active_batch' });
    
    // Concurrent Refresh
    console.log('Simulating simultaneous trending refreshes...');
    await Promise.all([refreshTrendingCache(), refreshTrendingCache()]);
    
    const pointer2 = await CacheControl.findOne({ key: 'trending_active_batch' });
    const batchCount = await TrendingPost.find({ batchId: pointer2.activeValue }).countDocuments();
    
    console.log(`Initial Pointer: ${pointer1.activeValue}, Final Pointer: ${pointer2.activeValue}`);
    if (pointer1.activeValue !== pointer2.activeValue && batchCount > 0) {
      console.log('✅ PASS: Atomic pointer swap safe under contention');
    } else {
      console.log('❌ FAIL: Pointer swap failed');
    }

    // 5. Pagination Stability
    console.log('\n--- TESTING PAGINATION STABILITY ---');
    // Create pool
    for (let i = 0; i < 15; i++) {
      const c = await Course.create({
        title: `Pag ${i}`, platform: 'Udemy', url: `https://pag-${i}-${Date.now()}`,
        tags: ['javascript'], averageRating: 4.0, totalCompletions: 100
      });
      await CompletedCourse.create({ user: creator._id, course: c._id, isPublic: true });
    }

    const page1 = await getSmartFeed(targetUser._id, null, 5);
    if (page1.nextCursor) {
      const page2 = await getSmartFeed(targetUser._id, page1.nextCursor, 5);
      const p1Ids = new Set(page1.posts.map(p => p.id));
      const duplicates = page2.posts.filter(p => p1Ids.has(p.id));
      if (duplicates.length === 0) {
        console.log('✅ PASS: Zero duplicates across paginated requests');
      } else {
        console.log('❌ FAIL: Found duplicates');
      }
    }

    console.log('\n--- B7.2 Hardened Test Complete ---');
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
};

testB7Hardened();
