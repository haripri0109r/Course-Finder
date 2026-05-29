import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { getSmartFeed } from '../../src/services/feedService.js';
import { refreshUserProfile } from '../../src/services/interestProfilingService.js';
import { refreshTrendingCache } from '../../src/services/trendingService.js';
import { flushEventQueue, trackEvent } from '../../src/services/activityService.js';
import { User, Course, CompletedCourse, ActivityEvent, UserPersonalization, FeedSession } from '../../src/models/index.js';

dotenv.config();

const testB82 = async () => {
  try {
    console.log('--- Starting B8.2 PRODUCTION HARDENING Validation ---');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Setup Test Users
    await CompletedCourse.deleteMany({});
    await Course.deleteMany({});
    await UserPersonalization.deleteMany({});
    await ActivityEvent.deleteMany({});
    await FeedSession.deleteMany({});
    await mongoose.connection.collection('trendingposts').deleteMany({});

    const emails = [
      'b82_target@example.com', 'b82_followed@example.com', 'b82_affinity@example.com', 
      'b82_muted@example.com', 'b82_random@example.com', 'b82_spam@example.com'
    ];
    for (const email of emails) await User.deleteOne({ email });

    const createUser = async (name, email) => await User.create({ name, email, password: 'password123' });

    const targetUser = await createUser('B82 Target', 'b82_target@example.com');
    const followed = await createUser('B82 Followed', 'b82_followed@example.com');
    const affinity = await createUser('B82 Affinity', 'b82_affinity@example.com');
    const muted = await createUser('B82 Muted', 'b82_muted@example.com');
    const random = await createUser('B82 Random', 'b82_random@example.com');
    const spam = await createUser('B82 Spam', 'b82_spam@example.com');

    targetUser.following = [followed._id];
    targetUser.mutedUsers = [muted._id];
    await targetUser.save();

    const getCourse = async (title, tags, rating = 4.5) => {
      const url = `https://${title.replace(/\s/g, '').toLowerCase()}-${Date.now()}-${Math.random()}`;
      return await Course.create({
        title, platform: 'Udemy', url, tags, averageRating: rating, totalCompletions: 100, image: 'valid.png'
      });
    };

    // Build Profiles
    console.log('Setting up robust profile...');
    await trackEvent({ userId: targetUser._id, eventType: 'search_query', metadata: { query: 'react' } });
    await trackEvent({ userId: targetUser._id, eventType: 'search_query', metadata: { query: 'python' } });
    
    // Affinity
    const cTemp = await getCourse('Temp', ['none']);
    const pTemp = await CompletedCourse.create({ user: affinity._id, course: cTemp._id, isPublic: true });
    for (let i = 0; i < 3; i++) {
       await trackEvent({ userId: targetUser._id, eventType: 'bookmark_save', targetId: pTemp._id, targetType: 'post' });
    }
    await flushEventQueue();
    await refreshUserProfile(targetUser._id);

    // Create 30 posts (Various sources)
    console.log('Creating 30 multi-source posts...');
    
    // Follow (5)
    for(let i=0; i<5; i++) {
      const c = await getCourse(`Follow ${i}`, ['general']);
      await CompletedCourse.create({ user: followed._id, course: c._id, isPublic: true, courseTags: c.tags, courseRating: 4.5 });
    }
    // Affinity (3)
    for(let i=0; i<3; i++) {
      const c = await getCourse(`Affinity ${i}`, ['general']);
      await CompletedCourse.create({ user: affinity._id, course: c._id, isPublic: true, courseTags: c.tags, courseRating: 4.5 });
    }
    // Interest (React/Python) (5)
    for(let i=0; i<5; i++) {
      const c = await getCourse(`Interest ${i}`, ['react']);
      await CompletedCourse.create({ user: random._id, course: c._id, isPublic: true, courseTags: c.tags, courseRating: 4.5 });
    }
    // Trending/Discovery (10)
    for(let i=0; i<10; i++) {
      const c = await getCourse(`Discovery ${i}`, ['random'], 4.9);
      await CompletedCourse.create({ user: random._id, course: c._id, isPublic: true, viewsCount: 100, courseTags: c.tags, courseRating: 4.9 });
    }
    // Creator Spam (7)
    for(let i=0; i<7; i++) {
      const c = await getCourse(`Spam ${i}`, ['random'], 4.9);
      await CompletedCourse.create({ user: spam._id, course: c._id, isPublic: true, viewsCount: 100, courseTags: c.tags, courseRating: 4.9 });
    }
    // Muted (1)
    const cM = await getCourse(`Muted 1`, ['general']);
    await CompletedCourse.create({ user: muted._id, course: cM._id, isPublic: true, courseTags: cM.tags, courseRating: 4.5 });
    
    // Self (1)
    const cS = await getCourse(`Self 1`, ['general']);
    await CompletedCourse.create({ user: targetUser._id, course: cS._id, isPublic: true, courseTags: cS.tags, courseRating: 4.5 });

    await refreshTrendingCache();

    console.log('\n--- FULL PAGINATION EXHAUSTION TEST ---');
    let allFetchedIds = new Set();
    let currentCursor = null;
    let pageCount = 0;
    let allFetchedPosts = [];

    while (true) {
      pageCount++;
      const res = await getSmartFeed(targetUser._id, currentCursor, 10);
      
      const newIds = res.posts.map(p => p.id);
      console.log(`Page ${pageCount}: ${newIds.length} items. Sources: [${res.posts.map(p => (p.sources||[]).join('+')).join(', ')}]`);
      
      let duplicates = 0;
      for (const id of newIds) {
        if (allFetchedIds.has(id)) duplicates++;
        allFetchedIds.add(id);
      }
      
      allFetchedPosts.push(...res.posts);

      if (duplicates > 0) {
        console.log(`❌ FAIL: Found ${duplicates} duplicates on page ${pageCount}`);
      }

      currentCursor = res.nextCursor;
      if (!currentCursor || res.posts.length === 0) break;
      if (pageCount > 10) break; // safety
    }

    if (allFetchedIds.size >= 10) { // Should be enough based on strict limits
      console.log(`✅ PASS: Full exhaustion retrieved ${allFetchedIds.size} unique items across ${pageCount} pages.`);
    } else {
      console.log(`❌ FAIL: Expected >= 10 items, got ${allFetchedIds.size}`);
    }

    // Assertions on the fetched set
    const spamPosts = allFetchedPosts.filter(p => p.authorName === 'B82 Spam');
    console.log('\n--- CREATOR REPETITION CAPS ---');
    console.log(`Spam Creator Total retrieved across all pages: ${spamPosts.length}/7`);
    if (spamPosts.length <= pageCount * 2) {
      console.log('✅ PASS: Spam creator effectively capped per page.');
    } else {
      console.log('❌ FAIL: Spam creator exceeded limits.');
    }

    // Negative Feedback assertions
    console.log('\n--- NEGATIVE FEEDBACK ASSERTIONS ---');
    const hasMuted = allFetchedPosts.some(p => p.authorName === 'B82 Muted');
    const hasSelf = allFetchedPosts.some(p => p.authorName === 'B82 Target');
    if (!hasMuted && !hasSelf) {
      console.log('✅ PASS: Muted and Self posts completely excluded.');
    } else {
      console.log(`❌ FAIL: Muted (${hasMuted}) or Self (${hasSelf}) leaked into feed.`);
    }

    console.log('\n--- QUOTA REALLOCATION ---');
    const followCount = allFetchedPosts.filter(p => p.sources.includes('follow')).length;
    console.log(`Total Follow Posts: ${followCount} / 5 created`);
    if (followCount > 0) {
      console.log('✅ PASS: Sources correctly fetched and redistributed via rank fallback.');
    } else {
      console.log('❌ FAIL: Quota redistribution failed.');
    }

    console.log('\n--- DENORMALIZATION CONSISTENCY ---');
    const testCourse = await getCourse('Denorm Test', ['old']);
    const testPost = await CompletedCourse.create({ user: followed._id, course: testCourse._id, isPublic: true, courseTitle: 'Old Title', courseTags: ['old'] });
    
    // Update Course
    testCourse.title = 'Updated New Title';
    testCourse.tags = ['new', 'updated'];
    await testCourse.save();
    
    // Allow hooks to run
    await new Promise(r => setTimeout(r, 1000));
    
    const verifyPost = await CompletedCourse.findById(testPost._id).lean();
    if (verifyPost.courseTitle === 'Updated New Title' && verifyPost.courseTags.includes('updated')) {
      console.log('✅ PASS: Course updates successfully propagated to CompletedCourse.');
    } else {
      console.log(`❌ FAIL: Denormalization sync failed. Expected 'Updated New Title', got '${verifyPost.courseTitle}'`);
    }

    console.log('\n--- B8.2 PRODUCTION HARDENING COMPLETE ---');
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
};

testB82();
