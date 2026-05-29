import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { getSmartFeed } from '../../src/services/feedService.js';
import { refreshUserProfile } from '../../src/services/interestProfilingService.js';
import { refreshTrendingCache } from '../../src/services/trendingService.js';
import { User, Course, CompletedCourse, ActivityEvent, UserPersonalization } from '../../src/models/index.js';

dotenv.config();

const testB8 = async () => {
  try {
    console.log('--- Starting B8 Multi-Source Recommendation Validation ---');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Setup
    const cleanUser = async (email) => {
      const u = await User.findOne({ email });
      if (u) {
        await CompletedCourse.deleteMany({ user: u._id });
        await ActivityEvent.deleteMany({ userId: u._id });
        await UserPersonalization.deleteOne({ userId: u._id });
        await User.deleteOne({ _id: u._id });
      }
    };

    const emails = ['b8_user@example.com', 'b8_followed@example.com', 'b8_affinity@example.com', 'b8_random@example.com', 'b8_muted@example.com'];
    for (const email of emails) await cleanUser(email);

    const createUser = async (name, email) => await User.create({ name, email, password: 'password123' });

    const targetUser = await createUser('B8 User', 'b8_user@example.com');
    const followedCreator = await createUser('Followed Creator', 'b8_followed@example.com');
    const affinityCreator = await createUser('Affinity Creator', 'b8_affinity@example.com');
    const randomCreator = await createUser('Random Creator', 'b8_random@example.com');
    const mutedCreator = await createUser('Muted Creator', 'b8_muted@example.com');

    // Follow and Mute setup
    targetUser.following = [followedCreator._id];
    targetUser.mutedUsers = [mutedCreator._id];
    await targetUser.save();

    console.log('Setting up content pool for different sources...');
    const getCourse = async (title, tags, isTrending = false) => {
      const c = await Course.create({
        title, platform: 'Udemy', url: `https://${title.replace(/\s/g, '').toLowerCase()}-${Date.now()}`,
        tags, averageRating: 4.5, totalCompletions: 1000, image: 'valid.png'
      });
      return c;
    };

    // A) Follow Graph Content
    const cFollow = await getCourse('Followed Post', ['general']);
    await CompletedCourse.create({ user: followedCreator._id, course: cFollow._id, isPublic: true, likesCount: 5 });

    // B) Affinity Content & Setup
    const cAffinity = await getCourse('Affinity Post', ['general']);
    const affinityPost = await CompletedCourse.create({ user: affinityCreator._id, course: cAffinity._id, isPublic: true, likesCount: 5 });
    // Build affinity
    for (let i = 0; i < 3; i++) {
        await ActivityEvent.create({ userId: targetUser._id, eventType: 'bookmark_save', targetId: affinityPost._id, targetType: 'post' });
    }

    // C) Interest Content & Setup
    const cInterest = await getCourse('Interest Match Post', ['python']);
    await CompletedCourse.create({ user: randomCreator._id, course: cInterest._id, isPublic: true, likesCount: 5 });
    // Build interest
    for (let i = 0; i < 5; i++) {
        await ActivityEvent.create({ userId: targetUser._id, eventType: 'search_query', metadata: { query: 'python' } });
    }

    // D) Trending Content
    const cTrending = await getCourse('Trending Discovery Post', ['general']);
    await CompletedCourse.create({ user: randomCreator._id, course: cTrending._id, isPublic: true, likesCount: 500, viewsCount: 10000 });
    
    // E) Discovery Content
    const cDiscovery = await getCourse('Pure Discovery Post', ['something_new']);
    await CompletedCourse.create({ user: randomCreator._id, course: cDiscovery._id, isPublic: true, viewsCount: 100 });

    // F) Muted Content
    const cMuted = await getCourse('Muted Post', ['general']);
    await CompletedCourse.create({ user: mutedCreator._id, course: cMuted._id, isPublic: true, likesCount: 5 });

    // Process Activity Events
    console.log('Processing activity and trending...');
    // Force a full refresh to guarantee all events are processed and capped properly
    await new Promise(resolve => setTimeout(resolve, 2000));
    await refreshUserProfile(targetUser._id);
    await refreshTrendingCache();

    // Verify interest was picked up
    const profile = await UserPersonalization.findOne({ userId: targetUser._id }).lean();
    console.log(`Profile interests: ${profile?.interests?.map(i => i.topic).join(', ')}`);

    // 2. Fetch Multi-Source Feed
    console.log('\n--- FETCHING MULTI-SOURCE FEED ---');
    const feed = await getSmartFeed(targetUser._id, null, 20);
    
    console.log(`Feed returned ${feed.posts.length} posts.`);
    const sources = feed.posts.map(p => ({ title: p.title, source: p.source }));
    console.log('Returned Posts with Sources:');
    sources.forEach(s => console.log(`- [${s.source || 'unknown'}] ${s.title}`));

    // Validation
    const sourceTypes = sources.map(s => s.source);
    
    if (sourceTypes.includes('follow')) console.log('✅ PASS: Follow candidates retrieved');
    else console.log('❌ FAIL: Missing follow candidates');

    if (sourceTypes.includes('affinity')) console.log('✅ PASS: Affinity candidates retrieved');
    else console.log('❌ FAIL: Missing affinity candidates');

    if (sourceTypes.includes('interest')) console.log('✅ PASS: Interest candidates retrieved');
    else console.log('❌ FAIL: Missing interest candidates');

    if (sourceTypes.includes('trending')) console.log('✅ PASS: Trending candidates retrieved');
    else console.log('❌ FAIL: Missing trending candidates');

    if (sourceTypes.includes('discovery')) console.log('✅ PASS: Discovery candidates retrieved');
    else console.log('❌ FAIL: Missing discovery candidates');

    if (!sources.some(s => s.title === 'Muted Post')) console.log('✅ PASS: Negative signals excluded at retrieval');
    else console.log('❌ FAIL: Muted post leaked into feed');

    // 3. Test Session Mixing & Fatigue
    console.log('\n--- TESTING SESSION FATIGUE (Creator Spam) ---');
    for(let i=0; i<5; i++) {
        const cSpam = await getCourse(`Spam Post ${i}`, ['python']);
        await CompletedCourse.create({ user: randomCreator._id, course: cSpam._id, isPublic: true, likesCount: 50 });
    }
    
    const feed2 = await getSmartFeed(targetUser._id, null, 10);
    const spamCount = feed2.posts.filter(p => p.authorName === 'Random Creator').length;
    console.log(`Random Creator Posts: ${spamCount}`);
    if (spamCount <= 2) console.log('✅ PASS: Creator fatigue limits applied after re-ranking');
    else console.log('❌ FAIL: Creator spam leaked');

    console.log('\n--- B8 Retrieval Architecture Test Complete ---');
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
};

testB8();