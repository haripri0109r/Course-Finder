import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { getSmartFeed } from '../../src/services/feedService.js';
import { User, Course, CompletedCourse, ActivityEvent } from '../../src/models/index.js';

dotenv.config();

const testB6 = async () => {
  try {
    console.log('--- Starting B6 Smart Feed Algorithm Test ---');
    
    // Connect to DB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Setup Reusable Seeded Users
    const findOrCreateUser = async (name, email) => {
      let user = await User.findOne({ email });
      if (!user) {
        user = await User.create({ name, email, password: 'password123' });
      }
      return user;
    };

    const testUser = await findOrCreateUser('Test B6 User', 'test_b6@example.com');
    const creatorA = await findOrCreateUser('Creator Alpha', 'creator_a@example.com');
    const creatorB = await findOrCreateUser('Creator Beta', 'creator_b@example.com');

    const userId = testUser._id;

    // 2. Setup Test Data (CRITICAL: Clean EVERYTHING for these users)
    await CompletedCourse.deleteMany({ user: { $in: [creatorA._id, creatorB._id] } });
    // Also clean up any potential "Creator B6" or other leftovers from previous runs
    const otherCreators = await User.find({ email: /b6|creator/ }).select('_id');
    const otherIds = otherCreators.map(u => u._id);
    await CompletedCourse.deleteMany({ user: { $in: otherIds } });
    
    await ActivityEvent.deleteMany({ userId });

    // 2.1 Create Courses with varying quality/tags
    const getCourse = async (title, tags, rating, completions, hasImage = true) => {
      return await Course.findOneAndUpdate(
        { url: `https://example.com/${title.replace(/\s/g, '').toLowerCase()}-${Date.now()}` },
        { 
          title, 
          platform: 'Udemy', 
          tags, 
          averageRating: rating, 
          totalCompletions: completions,
          image: hasImage ? `https://example.com/${title.replace(/\s/g, '').toLowerCase()}.png` : 'broken' 
        },
        { upsert: true, new: true }
      );
    };

    const courseJS = await getCourse('Javascript Deep Dive', ['javascript', 'web'], 4.9, 2000);
    const courseReact = await getCourse('React Architecture', ['react', 'javascript'], 4.7, 1500);

    // 2.2 Setup Social Context
    // Follow Creator A
    testUser.following = [creatorA._id];
    testUser.interests = ['javascript'];
    await testUser.save();

    // 2.3 Create Prolific Content for Diversity Check (Creator A)
    // Creator A is followed (+20 boost).
    // Let's give them HIGH engagement (100 likes = 500 points). Total ~520.
    console.log('Creating 10 posts for Creator A (Followed)...');
    for (let i = 1; i <= 10; i++) {
      const c = await getCourse(`Alpha Course ${i}`, ['javascript'], 4.5, 500);
      await CompletedCourse.create({
        user: creatorA._id,
        course: c._id,
        isPublic: true,
        likesCount: 100,
        createdAt: new Date()
      });
    }

    // 2.4 Create content from Creator B (Not followed)
    // Give them moderate engagement (40 likes = 200 points).
    console.log('Creating content from Creator B (Moderate Engagement)...');
    const courseB = await getCourse('Beta Trending', ['javascript'], 4.8, 1000);
    await CompletedCourse.create({
      user: creatorB._id,
      course: courseB._id,
      isPublic: true,
      likesCount: 40,
      createdAt: new Date()
    });

    // 2.5 Create content from Creator C, D, E, F to ensure we can fill the limit even with diversity
    const creators = [];
    for (let char of ['C', 'D', 'E', 'F', 'G']) {
      const c = await findOrCreateUser(`Creator ${char}`, `creator_${char.toLowerCase()}@example.com`);
      await CompletedCourse.deleteMany({ user: c._id });
      creators.push(c);
      const course = await getCourse(`${char} Course`, ['javascript'], 4.0, 100);
      await CompletedCourse.create({
        user: c._id,
        course: course._id,
        isPublic: true,
        likesCount: 5,
        createdAt: new Date()
      });
    }

    // 3. Test Feed Ranking & Diversity
    console.log('Fetching feed...');
    const limit = 10;
    const feed = await getSmartFeed(userId, null, limit);
    
    console.log(`Feed returned ${feed.posts.length} items. Next Cursor: ${feed.nextCursor}`);
    
    const creatorStats = {};
    feed.posts.forEach((post, i) => {
      creatorStats[post.authorName] = (creatorStats[post.authorName] || 0) + 1;
      console.log(`${i+1}. ${post.title} | Creator: ${post.authorName} | Likes: ${post.likesCount} | Score: ${post.engagementScore}`);
    });

    console.log('Creator Counts:', creatorStats);

    // VALIDATION 1: Diversity enforced
    const creatorACount = creatorStats['Creator Alpha'] || 0;
    if (creatorACount <= 2) {
      console.log('✅ PASS: Diversity cap enforced (Creator Alpha <= 2)');
    } else {
      console.log(`❌ FAIL: Diversity cap NOT enforced (Creator Alpha = ${creatorACount})`);
    }

    // VALIDATION 2: Full limit returned
    if (feed.posts.length === limit) {
      console.log('✅ PASS: Feed returned full limit');
    } else {
      console.log(`❌ FAIL: Feed underfilled (Got ${feed.posts.length}, expected ${limit})`);
    }

    // VALIDATION 3: Social Boost (Creator A is followed, should be at top)
    if (feed.posts[0].authorName === 'Creator Alpha' || feed.posts[1].authorName === 'Creator Alpha') {
       console.log('✅ PASS: Followed creator content is boosted');
    } else {
       console.log('❌ FAIL: Followed creator NOT in top 2');
    }

    // 4. Test Pagination Stability
    console.log('\n--- Testing Pagination ---');
    if (!feed.nextCursor) {
      console.log('⚠️ Skip pagination test: No next cursor (reached end of feed)');
    } else {
      const firstBatchIds = feed.posts.map(p => p.id);
      const nextBatch = await getSmartFeed(userId, feed.nextCursor, limit);
      
      if (nextBatch.posts.length > 0) {
        console.log(`Second batch returned ${nextBatch.posts.length} items.`);
        const secondBatchIds = nextBatch.posts.map(p => p.id);
        
        const intersection = firstBatchIds.filter(id => secondBatchIds.includes(id));
        if (intersection.length === 0) {
          console.log('✅ PASS: No duplicates across pages');
        } else {
          console.log(`❌ FAIL: Found ${intersection.length} duplicates across pages`);
        }
        console.log('✅ PASS: Pagination stable (got second page)');
      } else {
        console.log('⚠️ Skip pagination duplicate test: Second page empty');
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
};

testB6();
