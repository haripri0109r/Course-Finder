import mongoose from 'mongoose';
import ActivityEvent from '../models/ActivityEvent.js';
import CompletedCourse from '../models/CompletedCourse.js';
import UserPersonalization from '../models/UserPersonalization.js';

const WEIGHTS = {
  search_query: 8,
  bookmark_save: 10,
  course_open: 5,
  course_completion: 12,
  post_share: 15,
  follow_user: 20,
  comment: 10,
};

const CAPS = {
  INTERESTS: 50,
  SHORT_TERM: 20,
  AFFINITIES: 30
};

const DECAY_FACTOR = 0.95; // Weekly decay applied during full refresh

/**
 * INCREMENTAL PROFILE UPDATE
 * Uses atomic bulkWrite to prevent race-condition duplicates in nested arrays.
 */
export const recordInterestEvent = async (userId, event) => {
  try {
    const weight = WEIGHTS[event.eventType] || 1;
    const now = new Date();

    // A) Resolve Tags & Creator
    let tags = [];
    let creatorId = null;

    if (event.eventType === 'search_query' && event.metadata?.query) {
      tags = [event.metadata.query.toLowerCase().trim()];
    } else if (event.targetId) {
      const post = await CompletedCourse.findById(event.targetId).populate('course', 'tags').lean();
      if (post) {
        tags = post.course?.tags || [];
        creatorId = post.user?.toString();
      }
    }

    if (event.eventType === 'follow_user') {
      creatorId = event.targetId;
    }

    if (tags.length === 0 && !creatorId) return;

    // B) Truly Atomic Bulk Update
    const operations = [];

    // Ensure document exists with correct ObjectId types
    await UserPersonalization.updateOne(
      { userId: new mongoose.Types.ObjectId(userId) },
      { $setOnInsert: { interests: [], shortTermInterests: [], creatorAffinities: [] }, $set: { lastRefreshed: now } },
      { upsert: true }
    );

    for (const tag of tags) {
      const tagLower = tag.toLowerCase().trim();
      
      // Update or Push logic for nested arrays
      // Note: We use double update pattern within bulk to ensure atomicity for specific tags
      
      // Long-term
      operations.push({
        updateOne: {
          filter: { userId, 'interests.topic': tagLower },
          update: { $inc: { 'interests.$.score': weight }, $set: { 'interests.$.lastUpdated': now } }
        }
      });
      operations.push({
        updateOne: {
          filter: { userId, 'interests.topic': { $ne: tagLower } },
          update: { $push: { interests: { $each: [{ topic: tagLower, score: weight, lastUpdated: now }], $slice: -(CAPS.INTERESTS + 10) } } }
        }
      });

      // Short-term
      operations.push({
        updateOne: {
          filter: { userId, 'shortTermInterests.topic': tagLower },
          update: { $inc: { 'shortTermInterests.$.score': weight }, $set: { 'shortTermInterests.$.lastUpdated': now } }
        }
      });
      operations.push({
        updateOne: {
          filter: { userId, 'shortTermInterests.topic': { $ne: tagLower } },
          update: { $push: { shortTermInterests: { $each: [{ topic: tagLower, score: weight, lastUpdated: now }], $slice: -(CAPS.SHORT_TERM + 5) } } }
        }
      });
    }

    if (creatorId) {
      const creatorObjId = new mongoose.Types.ObjectId(creatorId);
      operations.push({
        updateOne: {
          filter: { userId, 'creatorAffinities.creatorId': creatorObjId },
          update: { $inc: { 'creatorAffinities.$.score': weight }, $set: { 'creatorAffinities.$.lastUpdated': now } }
        }
      });
      operations.push({
        updateOne: {
          filter: { userId, 'creatorAffinities.creatorId': { $ne: creatorObjId } },
          update: { $push: { creatorAffinities: { $each: [{ creatorId: creatorObjId, score: weight, lastUpdated: now }], $slice: -(CAPS.AFFINITIES + 5) } } }
        }
      });
    }

    if (operations.length > 0) {
      await UserPersonalization.bulkWrite(operations, { ordered: true });
    }
  } catch (error) {
    console.error('[ProfilingService] Atomic update failed:', error.message);
  }
};

/**
 * FULL PROFILE REFRESH (Scheduled Fallback)
 * Rebuilds the profile from raw history, applies decay, and enforces caps.
 */
export const refreshUserProfile = async (userId) => {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // 1. Fetch Events
  const events = await ActivityEvent.find({
    userId: new mongoose.Types.ObjectId(userId),
    createdAt: { $gte: ninetyDaysAgo }
  }).lean();

  if (events.length === 0) return null;

  const interestsMap = {};
  const shortTermMap = {};
  const affinityMap = {};

  // 2. Fetch Target Details in Batch
  const postIds = [...new Set(events.filter(e => e.targetType === 'post' || e.targetType === 'course_completion').map(e => e.targetId))];
  const posts = await CompletedCourse.find({ _id: { $in: postIds } }).populate('course', 'tags').lean();
  const postMap = posts.reduce((acc, p) => { acc[p._id.toString()] = p; return acc; }, {});

  for (const event of events) {
    const weight = WEIGHTS[event.eventType] || 1;
    const isShortTerm = event.createdAt >= sevenDaysAgo;

    let tags = [];
    if (event.eventType === 'search_query' && event.metadata?.query) {
      tags = [event.metadata.query.toLowerCase().trim()];
    } else if (postMap[event.targetId]) {
      tags = postMap[event.targetId].course?.tags || [];
    }

    tags.forEach(tag => {
      const t = tag.toLowerCase().trim();
      interestsMap[t] = (interestsMap[t] || 0) + weight;
      if (isShortTerm) shortTermMap[t] = (shortTermMap[t] || 0) + weight;
    });

    let creatorId = null;
    if (event.eventType === 'follow_user') creatorId = event.targetId;
    else if (postMap[event.targetId]) creatorId = postMap[event.targetId].user?.toString();

    if (creatorId) {
      affinityMap[creatorId] = (affinityMap[creatorId] || 0) + weight;
    }
  }

  // 3. Format, Sort, and Cap
  const sortAndCap = (map, limit) => 
    Object.entries(map)
      .map(([key, score]) => ({ key, score: score * DECAY_FACTOR }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

  const finalInterests = sortAndCap(interestsMap, CAPS.INTERESTS).map(i => ({ topic: i.key, score: i.score, lastUpdated: now }));
  const finalShortTerm = sortAndCap(shortTermMap, CAPS.SHORT_TERM).map(i => ({ topic: i.key, score: i.score, lastUpdated: now }));
  const finalAffinities = sortAndCap(affinityMap, CAPS.AFFINITIES).map(i => ({ creatorId: new mongoose.Types.ObjectId(i.key), score: i.score, lastUpdated: now }));

  // 4. Atomic Save
  return await UserPersonalization.findOneAndUpdate(
    { userId: new mongoose.Types.ObjectId(userId) },
    {
      interests: finalInterests,
      shortTermInterests: finalShortTerm,
      creatorAffinities: finalAffinities,
      lastRefreshed: now
    },
    { upsert: true, new: true }
  ).lean();
};

/**
 * Gets personalized profile, refreshing if stale (e.g. > 12 hours)
 */
export const getPersonalizedProfile = async (userId) => {
  let profile = await UserPersonalization.findOne({ userId: new mongoose.Types.ObjectId(userId) }).lean();
  
  const staleThreshold = new Date(Date.now() - 12 * 60 * 60 * 1000);
  if (!profile || profile.lastRefreshed < staleThreshold) {
    profile = await refreshUserProfile(userId);
  }
  
  // Dynamic Short-term Aging (Filter out very old "short-term" intents at read-time if refresh is lazy)
  if (profile?.shortTermInterests) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    profile.shortTermInterests = profile.shortTermInterests.filter(i => i.lastUpdated >= sevenDaysAgo);
  }
  
  return profile;
};
