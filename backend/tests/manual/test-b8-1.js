import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { getSmartFeed } from '../../src/services/feedService.js';
import { refreshUserProfile } from '../../src/services/interestProfilingService.js';
import { refreshTrendingCache } from '../../src/services/trendingService.js';
import { trackEvent, flushEventQueue } from '../../src/services/activityService.js';
import { User, Course, CompletedCourse, ActivityEvent, UserPersonalization } from '../../src/models/index.js';

dotenv.config();

const testB81 = async () => {
  try {
    console.log('--- Starting B8.1 Production Architecture Validation ---');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Setup Test Users
    // Purge relevant collections for absolute isolation
    await CompletedCourse.deleteMany({});
    await Course.deleteMany({});
    await UserPersonalization.deleteMany({});
    await ActivityEvent.deleteMany({});
    await mongoose.connection.collection('trendingposts').deleteMany({});

    const emails = [
      'b81_target@example.com', 'b81_creator@example.com', 'b81_followed@example.com', 'b81_explorer@example.com'
    ];
    for (const email of emails) await User.deleteOne({ email });

    const createUser = async (name, email) => await User.create({ name, email, password: 'password123' });

    const targetUser = await createUser('B81 Target', 'b81_target@example.com');
    const followed = await createUser('B81 Followed', 'b81_followed@example.com');
    const creator = await createUser('B81 Creator', 'b81_creator@example.com');
    const explorer = await createUser('B81 Explorer', 'b81_explorer@example.com');

    targetUser.following = [followed._id];
    await targetUser.save();

    const getCourse = async (title, tags, rating = 4.5) => {
      const url = `https://${title.replace(/\s/g, '').toLowerCase()}-${Date.now()}`;
      const course = await Course.create({
        title, platform: 'Udemy', url, tags, averageRating: rating, totalCompletions: 100, image: 'valid.png'
      });
      return course;
    };

    // 2. Setup Interest History
    console.log('Setting up interest history...');
    await trackEvent({ userId: targetUser._id, eventType: 'search_query', metadata: { query: 'javascript' } });
    await trackEvent({ userId: targetUser._id, eventType: 'search_query', metadata: { query: 'python' } });
    await flushEventQueue();
    await refreshUserProfile(targetUser._id);

    // 3. Create Content Pool
    console.log('Creating content pool...');
    
    const cJS = await getCourse('JS Advanced', ['javascript']);
    await CompletedCourse.create({ 
        user: followed._id, course: cJS._id, isPublic: true, 
        courseTags: ['javascript'], courseTitle: 'JS Advanced', courseImage: 'valid.png', courseRating: 4.8 
    });

    const cPy = await getCourse('Python Fast', ['python']);
    await CompletedCourse.create({ 
        user: creator._id, course: cPy._id, isPublic: true, 
        courseTags: ['python'], courseTitle: 'Python Fast', courseImage: 'valid.png', courseRating: 4.2 
    });

    for (let i = 0; i < 5; i++) {
        const c = await getCourse(`Discovery ${i}`, ['random'], 4.9);
        await CompletedCourse.create({ 
            user: explorer._id, course: c._id, isPublic: true, viewsCount: 10,
            courseTags: ['random'], courseTitle: `Discovery ${i}`, courseImage: 'valid.png', courseRating: 4.9
        });
    }

    await refreshTrendingCache();
// 4. TEST: DETERMINISTIC STABILITY
console.log('\n--- TESTING ORDER DETERMINISM ---');
const f1 = await getSmartFeed(targetUser._id, null, 20);
const f2 = await getSmartFeed(targetUser._id, null, 20);

const allSources = new Set(f1.posts.flatMap(p => p.sources || []));
console.log('Sources found in f1:', Array.from(allSources));

const ids1 = f1.posts.map(p => p.id);
    const ids2 = f2.posts.map(p => p.id);
    if (ids1.length > 0 && JSON.stringify(ids1) === JSON.stringify(ids2)) {
      console.log('✅ PASS: Feed ordering is deterministic across requests');
    } else {
      console.log('❌ FAIL: Feed ordering inconsistent or empty');
    }

    // 5. TEST: DUAL-INTEREST RANKING
    console.log('\n--- TESTING DUAL-INTEREST RANKING ---');
    if (f1.posts.some(p => p.tags.includes('python'))) {
      console.log('✅ PASS: Short-term interest (python) retrieved and ranked');
    } else {
      console.log('❌ FAIL: Short-term interest missing');
    }

    // 6. TEST: STABLE PAGINATION & CONCURRENT INSERT
    console.log('\n--- TESTING PAGINATION STABILITY & CONCURRENT INSERT ---');
    const page1 = await getSmartFeed(targetUser._id, null, 3);
    console.log(`Page 1: ${page1.posts.map(p => `${p.title} [${(p.sources || []).join(',')}]`).join(' | ')}`);
    
    const cNew = await getCourse('Ultra Trending', ['javascript']);
    await CompletedCourse.create({ 
        user: followed._id, course: cNew._id, isPublic: true, likesCount: 1000,
        courseTags: ['javascript'], courseTitle: 'Ultra Trending', courseImage: 'valid.png', courseRating: 5.0
    });
    console.log('Inserted ultra-high rank post during pagination...');

    const page2 = await getSmartFeed(targetUser._id, page1.nextCursor, 3);
    console.log(`Page 2: ${page2.posts.map(p => p.title).join(', ')}`);

    const p1Ids = new Set(page1.posts.map(p => p.id));
    const duplicates = page2.posts.filter(p => p1Ids.has(p.id));
    if (duplicates.length === 0) {
      console.log('✅ PASS: Stable cursor pagination (Zero duplicates)');
    } else {
      console.log(`❌ FAIL: Found ${duplicates.length} duplicates across pages`);
    }
    if (!page2.posts.some(p => p.title === 'Ultra Trending')) {
      console.log('✅ PASS: Concurrent insert correctly ignored (Cursor stability)');
    } else {
      console.log('❌ FAIL: Cursor stability broken');
    }

    // 7. SOURCE ATTRIBUTION
    console.log('\n--- TESTING SOURCE ATTRIBUTION ---');
    if (f1.posts.some(p => p.sources && p.sources.length > 0)) {
       console.log('✅ PASS: Source attribution preserved');
    } else {
       console.log('❌ FAIL: Source attribution lost');
    }

    // 8. DETERMINISTIC DISCOVERY
    console.log('\n--- TESTING DETERMINISTIC DISCOVERY ---');
    const discoveryPosts = f1.posts.filter(p => (p.sources || []).includes('discovery'));
    if (discoveryPosts.length > 0) {
       console.log(`✅ PASS: Deterministic discovery retrieved ${discoveryPosts.length} items`);
    } else {
       console.log('❌ FAIL: No discovery items found');
    }

    const cleanUser = async (email) => {
      const u = await User.findOne({ email });
      if (u) {
        await UserPersonalization.deleteOne({ userId: u._id });
        await ActivityEvent.deleteMany({ userId: u._id });
        await User.deleteOne({ _id: u._id });
      }
    };

    for (const email of emails) await cleanUser(email);
    console.log('\n--- B81 Production Test Complete ---');
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
};

testB81();
