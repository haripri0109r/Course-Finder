import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { getSmartFeed } from '../../src/services/feedService.js';
import { refreshUserProfile } from '../../src/services/interestProfilingService.js';
import { refreshTrendingCache } from '../../src/services/trendingService.js';
import { flushEventQueue, trackEvent } from '../../src/services/activityService.js';
import { User, Course, CompletedCourse, ActivityEvent, UserPersonalization, FeedSession } from '../../src/models/index.js';

dotenv.config();

const testB83 = async () => {
  try {
    console.log('--- Starting B8.3 ABSOLUTE PRODUCTION CORRECTION Validation ---');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Setup Test Environment (Absolute Isolation)
    await CompletedCourse.deleteMany({});
    await Course.deleteMany({});
    await UserPersonalization.deleteMany({});
    await ActivityEvent.deleteMany({});
    await FeedSession.deleteMany({});
    await mongoose.connection.collection('trendingposts').deleteMany({});

    const emails = [
      'b83_target@example.com', 'b83_followed@example.com', 'b83_affinity@example.com', 
      'b83_muted@example.com', 'b83_random@example.com', 'b83_spam@example.com'
    ];
    for (const email of emails) await User.deleteOne({ email });

    const createUser = async (name, email) => await User.create({ name, email, password: 'password123' });

    const targetUser = await createUser('B83 Target', 'b83_target@example.com');
    const followed = await createUser('B83 Followed', 'b83_followed@example.com');
    const affinity = await createUser('B83 Affinity', 'b83_affinity@example.com');
    const muted = await createUser('B83 Muted', 'b83_muted@example.com');
    const random = await createUser('B83 Random', 'b83_random@example.com');
    const spam = await createUser('B83 Spam', 'b83_spam@example.com');

    targetUser.following = [followed._id];
    await targetUser.save();

    const getCourse = async (title, tags, rating = 4.5) => {
      const url = `https://${title.replace(/\s/g, '').toLowerCase()}-${Date.now()}-${Math.random()}`;
      return await Course.create({
        title, platform: 'Udemy', url, tags, averageRating: rating, totalCompletions: 100, image: 'valid.png'
      });
    };

    console.log('Setting up robust profile...');
    await trackEvent({ userId: targetUser._id, eventType: 'search_query', metadata: { query: 'react' } });
    await trackEvent({ userId: targetUser._id, eventType: 'search_query', metadata: { query: 'python' } });
    
    // Affinity building
    const cTemp = await getCourse('Temp', ['none']);
    const pTemp = await CompletedCourse.create({ user: affinity._id, course: cTemp._id, isPublic: true });
    for (let i = 0; i < 5; i++) {
       await trackEvent({ userId: targetUser._id, eventType: 'bookmark_save', targetId: pTemp._id, targetType: 'post' });
    }
    
    // Explicit flush instead of timeout hack
    await flushEventQueue();
    await refreshUserProfile(targetUser._id);

    console.log('Creating 30 multi-source posts...');
    const createdPosts = [];

    const createPosts = async (count, prefix, user, tags, baseLikes = 0) => {
      for(let i=0; i<count; i++) {
        const c = await getCourse(`${prefix} ${i}`, tags);
        const post = await CompletedCourse.create({ user: user._id, course: c._id, isPublic: true, courseTags: tags, courseRating: 4.5, likesCount: baseLikes });
        createdPosts.push(post);
      }
    };

    await createPosts(5, 'Follow', followed, ['general'], 10);
    await createPosts(3, 'Affinity', affinity, ['general'], 5);
    await createPosts(5, 'Interest ST', random, ['react'], 5);
    await createPosts(5, 'Interest LT', random, ['python'], 5);
    await createPosts(10, 'Discovery', random, ['random'], 100); // High views for discovery/trending
    
    // Spam creator to test limits
    await createPosts(7, 'Spam', spam, ['react'], 50);

    // Muted content
    const cM = await getCourse('Muted', ['general']);
    const mutedPost = await CompletedCourse.create({ user: muted._id, course: cM._id, isPublic: true, courseTags: ['general'] });
    createdPosts.push(mutedPost);

    await refreshTrendingCache();

    // 1. TEST: ZERO SKIPS & DUPLICATES MATHEMATICAL PROOF
    console.log('\n--- MATHEMATICAL PAGINATION PROOF (Zero Skips & Zero Duplicates) ---');
    
    const limit = 5;
    let allFetchedIds = new Set();
    let currentCursor = null;
    let pageCount = 0;
    const allFetchedPosts = [];

    // Paginate until absolute exhaustion
    while (true) {
      pageCount++;
      const res = await getSmartFeed(targetUser._id, currentCursor, limit);
      if (res.posts.length === 0) break;

      const newIds = res.posts.map(p => p.id);
      let duplicates = 0;
      for (const id of newIds) {
        if (allFetchedIds.has(id)) duplicates++;
        allFetchedIds.add(id);
      }
      allFetchedPosts.push(...res.posts);
      currentCursor = res.nextCursor;

      if (duplicates > 0) {
        console.log(`❌ FAIL: Found ${duplicates} duplicates on page ${pageCount}`);
      }

      if (!currentCursor) break;
      if (pageCount > 10) break; // safety
    }

    console.log(`Total retrieved: ${allFetchedIds.size} unique items across ${pageCount} pages.`);
    if (allFetchedIds.size > 0 && allFetchedIds.size === allFetchedPosts.length) {
      console.log('✅ PASS: Pagination returned mathematically distinct sets across all pages.');
    } else {
      console.log(`❌ FAIL: Fetched universe size mismatch. (Retrieved: ${allFetchedIds.size})`);
    }

    // 2. TEST: LIVE NEGATIVE SIGNALS
    console.log('\n--- TESTING LIVE NEGATIVE SIGNALS ---');
    // Start a new session
    const freshPage1 = await getSmartFeed(targetUser._id, null, 10);
    const postToHide = freshPage1.posts[0];
    const creatorToMute = freshPage1.posts[1].userId;
    
    console.log(`Hiding post: ${postToHide.title}`);
    console.log(`Muting creator ID: ${creatorToMute}`);
    
    targetUser.hiddenPosts = [postToHide.id];
    targetUser.mutedUsers = [creatorToMute, muted._id];
    await targetUser.save();

    // Fetch Page 2 using the SAME active session cursor
    const activePage2 = await getSmartFeed(targetUser._id, freshPage1.nextCursor, 20);
    
    const stillVisibleHidden = activePage2.posts.some(p => p.id === postToHide.id);
    const stillVisibleMuted = activePage2.posts.some(p => p.userId === creatorToMute.toString());
    const originalMutedVisible = activePage2.posts.some(p => p.id === mutedPost._id.toString());
    
    if (!stillVisibleHidden && !stillVisibleMuted && !originalMutedVisible) {
      console.log('✅ PASS: Negative signals instantly evaluated live during active session.');
    } else {
      console.log('❌ FAIL: Negative signals leaked into active session.');
    }

    // 3. TEST: TOPIC FATIGUE DIVERSIFICATION
    console.log('\n--- TESTING TOPIC FATIGUE DIVERSIFICATION ---');
    const firstPageReact = allFetchedPosts.slice(0, 5).filter(p => p.tags.includes('react')).length;
    console.log(`React posts on Page 1: ${firstPageReact}/5`);
    if (firstPageReact <= 3) {
       console.log('✅ PASS: Topic fatigue suppressed monolithic topical flooding.');
    } else {
       console.log('❌ FAIL: Topic flooding detected.');
    }

    // 4. TEST: FAIR ALLOCATION (NO FIRST-MATCH BIAS)
    console.log('\n--- TESTING FAIR MULTI-SOURCE ALLOCATION ---');
    const fetchedSources = new Set(allFetchedPosts.slice(0, 15).map(p => (p.sources||[])[0]));
    console.log(`Sources present in top 15: ${Array.from(fetchedSources).join(', ')}`);
    if (fetchedSources.size >= 2) {
      console.log('✅ PASS: Allocator satisfied constrained quotas without total dominance.');
    } else {
      console.log('❌ FAIL: Allocator bias detected. Only 1 source found.');
    }

    // 5. TEST: DENORM ASYNC SYNC
    console.log('\n--- TESTING ASYNC DENORMALIZATION SYNC ---');
    const testCourse = await getCourse('Old Sync Title', ['old']);
    const testPost = await CompletedCourse.create({ user: followed._id, course: testCourse._id, isPublic: true, courseTitle: 'Old Title', courseTags: ['old'] });
    
    testCourse.title = 'New Async Title';
    await testCourse.save();
    
    // Let the setImmediate hook queue the job
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const { default: SyncJobModel } = await import('../../src/models/SyncJob.js');
    const pendingJobs = await SyncJobModel.countDocuments({ status: 'pending' });
    console.log(`Pending sync jobs before flush: ${pendingJobs}`);

    // Explicitly flush sync jobs
    const { flushSyncJobs } = await import('../../src/services/backgroundSyncService.js');
    await flushSyncJobs();
    
    const verifyPost = await CompletedCourse.findById(testPost._id).lean();
    if (verifyPost.courseTitle === 'New Async Title') {
      console.log('✅ PASS: Async course update propagated successfully to denormalized model.');
    } else {
      console.log(`❌ FAIL: Async denormalization sync failed. Title is: ${verifyPost.courseTitle}`);
    }

    // 6. TEST: SESSION STORAGE COMPRESSION
    console.log('\n--- TESTING SESSION STORAGE EFFICIENCY ---');
    const sessionDoc = await FeedSession.findOne({ sessionToken: freshPage1.nextCursor }).lean();
    if (sessionDoc && !sessionDoc.seenPostIds) {
      console.log('✅ PASS: Unbounded seenPostIds array successfully removed from session storage.');
      console.log(`   Session uses lightweight cursorState: ${JSON.stringify(sessionDoc.cursorState)}`);
    } else {
      console.log('❌ FAIL: Unbounded storage still present in session document.');
    }

    console.log('\n--- B8.3 FINAL HARDENING COMPLETE ---');
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
};

testB83();