import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { getSmartFeed } from '../../src/services/feedService.js';
import { User, Course, CompletedCourse, ActivityEvent } from '../../src/models/index.js';

dotenv.config();

const testB6Strong = async () => {
  try {
    console.log('--- Starting B6 Strong Smart Feed Validation (FINAL PATCH) ---');
    
    // 0. Connect to DB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Cleanup & Setup Reusable Users
    const cleanUser = async (email) => {
      const u = await User.findOne({ email });
      if (u) {
        await CompletedCourse.deleteMany({ user: u._id });
        await ActivityEvent.deleteMany({ userId: u._id });
        await User.deleteOne({ _id: u._id });
      }
    };

    const emails = [
      'target_user@example.com',
      'followed_creator@example.com',
      'affinity_creator@example.com',
      'regular_creator@example.com',
      'junk_creator@example.com',
      'prolific_creator@example.com',
      'concurrent_creator@example.com'
    ];
    for (const email of emails) await cleanUser(email);

    const createUser = async (name, email) => {
      return await User.create({ name, email, password: 'password123' });
    };

    const targetUser = await createUser('Target User', 'target_user@example.com');
    const followedCreator = await createUser('Followed Creator', 'followed_creator@example.com');
    const affinityCreator = await createUser('Affinity Creator', 'affinity_creator@example.com');
    const regularCreator = await createUser('Regular Creator', 'regular_creator@example.com');
    const junkCreator = await createUser('Junk Creator', 'junk_creator@example.com');
    const prolificCreator = await createUser('Prolific Creator', 'prolific_creator@example.com');

    // 2. Setup Social Graph & Interests
    targetUser.following = [followedCreator._id];
    targetUser.interests = ['javascript', 'typescript'];
    await targetUser.save();

    // 3. Setup Affinity History
    const affinityCourse = await Course.create({ 
      title: 'Affinity Course', platform: 'Udemy', url: `https://aff-${Date.now()}`, tags: ['javascript'] 
    });
    const affinityPost = await CompletedCourse.create({
      user: affinityCreator._id,
      course: affinityCourse._id,
      isPublic: true
    });
    await ActivityEvent.create({
      userId: targetUser._id,
      eventType: 'course_open',
      targetId: affinityPost._id,
      targetType: 'post'
    });

    // 4. Create Test Data
    const getCourse = async (title, tags, rating = 4.0, completions = 100, image = 'valid.png') => {
      return await Course.create({
        title, platform: 'Udemy', url: `https://${title.replace(/\s/g, '').toLowerCase()}-${Date.now()}`,
        tags, averageRating: rating, totalCompletions: completions, image
      });
    };

    // A) Followed content (Should rank high)
    const c1 = await getCourse('Advanced JS', ['javascript'], 4.8, 2000);
    await CompletedCourse.create({
      user: followedCreator._id,
      course: c1._id,
      isPublic: true,
      likesCount: 10,
      createdAt: new Date()
    });

    // B) Affinity content (Should rank high)
    const c2 = await getCourse('Advanced TS', ['typescript'], 4.7, 1500);
    await CompletedCourse.create({
      user: affinityCreator._id,
      course: c2._id,
      isPublic: true,
      likesCount: 5,
      createdAt: new Date()
    });

    // C) Regular content (Should rank middle)
    const c3 = await getCourse('Node.js Basics', ['node'], 4.2, 500);
    await CompletedCourse.create({
      user: regularCreator._id,
      course: c3._id,
      isPublic: true,
      likesCount: 20,
      createdAt: new Date()
    });

    // D) Junk content (Should rank low - penalty)
    const c4 = await getCourse('Spam Course', ['junk'], 1.0, 1, 'broken');
    await CompletedCourse.create({
      user: junkCreator._id,
      course: c4._id,
      isPublic: true,
      createdAt: new Date()
    });

    // E) Prolific content (Diversity Check)
    console.log('Creating 15 posts for Prolific Creator...');
    for (let i = 1; i <= 15; i++) {
      const c = await getCourse(`Prolific ${i}`, ['web'], 4.0, 100);
      await CompletedCourse.create({
        user: prolificCreator._id,
        course: c._id,
        isPublic: true,
        likesCount: 50,
        createdAt: new Date(Date.now() - i * 1000)
      });
    }

    // 5. RUN VALIDATIONS
    console.log('\n--- FETCHING FEED (Page 1) ---');
    const limit = 5;
    const page1 = await getSmartFeed(targetUser._id, null, limit);
    
    console.log(`Returned ${page1.posts.length} posts.`);
    console.log('Page 1 Sample:', page1.posts.map(p => `${p.title} (${p.authorName})`).join(' | '));

    // Check Diversity (Capped at 2)
    const prolificCount = page1.posts.filter(p => p.authorName === 'Prolific Creator').length;
    console.log(`Prolific Creator Count in Page 1: ${prolificCount}`);
    if (prolificCount <= 2) console.log('✅ PASS: Diversity Control enforced');
    else console.log('❌ FAIL: Diversity Control failed');

    // 6. Test Pagination Stability with Concurrent Insert
    console.log('\n--- TESTING PAGINATION STABILITY (Concurrent Insert) ---');
    
    const concurrentCreator = await createUser('Concurrent Creator', 'concurrent_creator@example.com');
    const cNew = await getCourse('New High Ranked Post', ['javascript'], 5.0, 5000);
    
    // This post should rank HIGHER than everything else
    await CompletedCourse.create({
      user: concurrentCreator._id,
      course: cNew._id,
      isPublic: true,
      likesCount: 500,
      createdAt: new Date()
    });
    console.log('Inserted new high-ranked post during pagination...');

    const page2 = await getSmartFeed(targetUser._id, page1.nextCursor, limit);
    console.log(`Returned ${page2.posts.length} posts on Page 2.`);
    console.log('Page 2 Sample:', page2.posts.map(p => `${p.title} (${p.authorName})`).join(' | '));

    const p1Ids = new Set(page1.posts.map(p => p.id));
    const duplicates = page2.posts.filter(p => p1Ids.has(p.id));
    
    if (duplicates.length === 0) {
      console.log('✅ PASS: Stable Cursor Pagination guaranteed (No duplicates)');
    } else {
      console.log(`❌ FAIL: Found ${duplicates.length} duplicates across pages`);
    }

    const newPostVisible = page2.posts.some(p => p.title === 'New High Ranked Post');
    if (!newPostVisible) {
      console.log('✅ PASS: New post inserted "above" current cursor correctly suppressed from Page 2 (No skips)');
    } else {
       console.log('❌ FAIL: New post visible on Page 2 (Should have been on Page 1 if present before start)');
    }

    // 7. Test Negative Feedback
    console.log('\n--- TESTING NEGATIVE FEEDBACK (Hide Post) ---');
    const postToHide = page2.posts[0];
    console.log(`Hiding post from Page 2: ${postToHide.title}`);
    targetUser.hiddenPosts.push(postToHide.id);
    await targetUser.save();

    const page2AfterHide = await getSmartFeed(targetUser._id, page1.nextCursor, limit);
    const postStillExists = page2AfterHide.posts.some(p => p.id === postToHide.id);
    if (!postStillExists) console.log('✅ PASS: Hidden post suppressed dynamically');
    else console.log('❌ FAIL: Hidden post still visible');

    // 8. Cleanup
    for (const email of emails) await cleanUser(email);
    console.log('\n--- B6 Strong FINAL Test Complete ---');
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
};

testB6Strong();
