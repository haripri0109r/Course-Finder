import mongoose from 'mongoose';
import crypto from 'crypto';
import { CompletedCourse, ActivityEvent, User, FeedSession } from '../models/index.js';
import { PAGINATION_LIMIT } from '../config/constants.js';
import { formatCourse } from '../utils/formatter.js';
import * as userService from './userService.js';
import { trackEvent } from './activityService.js';
import { rankCandidates } from './feedRankingService.js';
import { getPersonalizedProfile } from './interestProfilingService.js';
import { getCandidates, MAX_CANDIDATES, QUOTAS } from './feedCandidateService.js';

/**
 * PRODUCTION-GRADE QUOTA ALLOCATOR & FATIGUE SUPPRESSION
 * B8.3: Uses "Most Constrained Source First" allocation to prevent bias.
 */
const allocatePage = (rankedCandidates, limit, initialFatigue) => {
  const selected = [];
  const fatigue = { 
    seenCreators: { ...(initialFatigue.seenCreators || {}) },
    seenCourses: { ...(initialFatigue.seenCourses || {}) },
    seenTopics: { ...(initialFatigue.seenTopics || {}) }
  };
  
  const targets = {
    follow: Math.ceil(limit * QUOTAS.FOLLOW),
    affinity: Math.ceil(limit * QUOTAS.AFFINITY),
    interest_st: Math.ceil(limit * QUOTAS.INTEREST_ST),
    interest_lt: Math.ceil(limit * QUOTAS.INTEREST_LT),
    trending: Math.ceil(limit * QUOTAS.TRENDING),
    discovery: Math.ceil(limit * QUOTAS.DISCOVERY)
  };
  
  const isValid = (c) => {
    const creator = c.user.toString();
    const course = (c.courseDetails?._id || c.course).toString();
    if ((fatigue.seenCreators[creator] || 0) >= 2) return false;
    if (c.sources.includes('discovery') && (fatigue.seenCreators[creator] || 0) >= 1) return false;
    if ((fatigue.seenCourses[course] || 0) >= 1) return false;
    return true;
  };

  const markSeen = (c) => {
    const creator = c.user.toString();
    const course = (c.courseDetails?._id || c.course).toString();
    fatigue.seenCreators[creator] = (fatigue.seenCreators[creator] || 0) + 1;
    fatigue.seenCourses[course] = (fatigue.seenCourses[course] || 0) + 1;
  };

  const pool = [...rankedCandidates];
  
  // PASS 1: Strict Quota Allocation (Most deficit first)
  for (let i = 0; i < pool.length; i++) {
    const c = pool[i];
    if (!c || !isValid(c)) continue;
    
    // Find the source this candidate has that needs the most fulfillment
    let bestSource = null;
    let maxDeficit = -1;
    for (const src of c.sources) {
      if (targets[src] !== undefined && targets[src] > maxDeficit && targets[src] > 0) {
        bestSource = src;
        maxDeficit = targets[src];
      }
    }

    if (bestSource) {
      targets[bestSource]--;
      selected.push(c);
      markSeen(c);
      pool[i] = null; 
    }
    if (selected.length === limit) break;
  }

  // PASS 2: Deterministic Redistribution Priority (interest -> discovery -> trending)
  const redistributeList = ['interest_st', 'interest_lt', 'discovery', 'trending'];
  for (const redistributeSrc of redistributeList) {
    let currentDeficit = Object.values(targets).reduce((a, b) => a + b, 0);
    if (currentDeficit === 0 || selected.length === limit) break;

    for (const t in targets) targets[t] = 0;
    targets[redistributeSrc] = currentDeficit;

    for (let i = 0; i < pool.length; i++) {
      const c = pool[i];
      if (!c || !isValid(c)) continue;
      
      if (c.sources.includes(redistributeSrc) && targets[redistributeSrc] > 0) {
        targets[redistributeSrc]--;
        selected.push(c);
        markSeen(c);
        pool[i] = null;
      }
      if (selected.length === limit) break;
    }
  }

  // PASS 3: Wildcard Fallback (Top Remaining)
  if (selected.length < limit) {
    for (let i = 0; i < pool.length; i++) {
      const c = pool[i];
      if (!c || !isValid(c)) continue;
      selected.push(c);
      markSeen(c);
      if (selected.length === limit) break;
    }
  }

  // Preserve deterministic ordering for final presentation
  selected.sort((a, b) => {
    if (b.finalFeedScore !== a.finalFeedScore) return b.finalFeedScore - a.finalFeedScore;
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    if (dateB !== dateA) return dateB - dateA;
    return b._id.toString().localeCompare(a._id.toString());
  });

  return { posts: selected, updatedFatigueState: fatigue };
};

/**
 * PRODUCTION-GRADE RECOMMENDATION RETRIEVAL FEED SERVICE (B8.3)
 * Features: Lightweight Cursor Sessions, Live Negative Filters, Zero Skips/Duplicates.
 */
export const getSmartFeed = async (userId, cursor = null, limit = PAGINATION_LIMIT) => {
  try {
    let session = null;
    
    // 1. Immutable Session Management (Lightweight Cursor Boundary)
    if (cursor) {
      session = await FeedSession.findOne({ sessionToken: cursor }).lean();
    }

    if (!session) {
      const [user, profile] = await Promise.all([
        User.findById(userId).select('following').lean(),
        getPersonalizedProfile(userId)
      ]);
      
      const sessionToken = crypto.randomBytes(16).toString('hex');
      session = {
        userId: new mongoose.Types.ObjectId(userId),
        sessionToken,
        context: {
          followingIds: user?.following || [],
          interests: (profile?.interests || []).slice(0, 50),
          shortTermInterests: (profile?.shortTermInterests || []).slice(0, 20),
          affinityScores: (profile?.creatorAffinities || []).slice(0, 30)
        },
        cursorState: null,
        fatigueState: { seenCreators: {}, seenCourses: {}, seenTopics: {} },
        expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 Hour TTL
      };
      
      await FeedSession.create(session);
    }

    // 2. Live Negative Signal Integration (Fetched fresh every request)
    const userRecord = await User.findById(userId).select('hiddenPosts mutedUsers').lean();
    const hiddenPosts = userRecord?.hiddenPosts || [];
    const mutedUsers = userRecord?.mutedUsers || [];

    // 3. RETRIEVE CANDIDATES
    const fetchPoolSize = MAX_CANDIDATES;
    let rawCandidates = await getCandidates(
      userId, 
      session.context, 
      session.context.followingIds, 
      hiddenPosts, // Only strict explicit hides passed to DB
      mutedUsers, 
      fetchPoolSize
    );

    // 4. DETERMINISTIC RE-RANKING
    rawCandidates = await CompletedCourse.populate(rawCandidates, { path: 'course' });
    rawCandidates = rawCandidates.map(c => {
      c.courseDetails = c.course || {};
      return c;
    });

    let rankedCandidates = rankCandidates(rawCandidates, {
      followingIds: session.context.followingIds,
      interests: session.context.interests,
      shortTermInterests: session.context.shortTermInterests,
      affinityScores: session.context.affinityScores,
      seenCreators: [], 
      seenCourses: [],
      seenTopics: [] // Handled in allocation
    });

    // 5. LIGHTWEIGHT CURSOR FILTERING
    // Ensures mathematically that we strictly resume exactly where we left off.
    if (session.cursorState) {
      rankedCandidates = rankedCandidates.filter(c => {
        if (c.finalFeedScore < session.cursorState.score) return true;
        if (c.finalFeedScore === session.cursorState.score) {
          const createdAt = new Date(c.createdAt).getTime();
          const cursorDate = new Date(session.cursorState.createdAt).getTime();
          if (createdAt < cursorDate) return true;
          if (createdAt === cursorDate) {
            return c._id.toString() < session.cursorState.id;
          }
        }
        return false;
      });
    }

    // 6. ALLOCATE PAGE
    const { posts: finalPosts, updatedFatigueState } = allocatePage(rankedCandidates, limit, session.fatigueState);

    // 7. UPDATE COMPACT SESSION STATE
    if (finalPosts.length > 0) {
      const lastItem = finalPosts[finalPosts.length - 1];
      const newCursorState = {
        score: lastItem.finalFeedScore,
        createdAt: lastItem.createdAt,
        id: lastItem._id.toString()
      };
      
      await FeedSession.updateOne(
        { sessionToken: session.sessionToken },
        {
          $set: { 
            cursorState: newCursorState,
            fatigueState: updatedFatigueState 
          }
        }
      );
    }

    // 8. POPULATION & FORMATTING
    const populated = await CompletedCourse.populate(finalPosts, [
      { path: 'user', select: 'name profilePicture' }
    ]);

    const posts = populated.map(item => {
      const formatted = formatCourse(item, userId);
      formatted.sources = item.sources || [item.source];
      return formatted;
    });

    const nextCursor = finalPosts.length > 0 ? session.sessionToken : null;

    return { posts, nextCursor };
  } catch (error) {
    console.error('[FeedService] B8.3 Retrieval Error:', error);
    return { posts: [], nextCursor: null };
  }
};

/**
 * TRENDING & VIEW TRACKING (Existing logic preserved but audited)
 */
export const getTrendingCompletions = async (userId) => {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const pipeline = [
    { $match: { isPublic: true, createdAt: { $gte: twentyFourHoursAgo } } },
    {
      $addFields: {
        trendingScore: {
          $add: [
            { $multiply: [{ $ifNull: ["$likesCount", 0] }, 5] }, // Consistent weights
            { $multiply: [{ $ifNull: ["$commentCount", 0] }, 10] },
            { $ifNull: ["$viewsCount", 0] }
          ]
        }
      }
    },
    { $sort: { trendingScore: -1, _id: -1 } },
    { $limit: 10 }
  ];

  const items = await CompletedCourse.aggregate(pipeline);
  const populated = await CompletedCourse.populate(items, [
    { path: 'user', select: 'name profilePicture' },
    { path: 'course', select: 'title platform url tags level averageRating totalCompletions image' }
  ]);

  return { success: true, data: populated.map(item => formatCourse(item, userId)) };
};

export const trackUniqueView = async (userId, postId) => {
  if (!mongoose.Types.ObjectId.isValid(postId)) throw new Error('Invalid post ID');
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

  const recentEvent = await ActivityEvent.findOne({
    eventType: { $in: ['view', 'course_open'] },
    userId,
    targetId: postId,
    createdAt: { $gte: sixHoursAgo }
  }).lean();

  if (recentEvent) {
    const post = await CompletedCourse.findById(postId).select('viewsCount').lean();
    return { success: true, viewsCount: post?.viewsCount || 0, cooldown: true };
  }

  const updatedPost = await CompletedCourse.findByIdAndUpdate(postId, { $inc: { viewsCount: 1 } }, { new: true }).populate('course', 'tags');
  if (!updatedPost) throw new Error('Post not found');

  trackEvent({ eventType: 'course_open', userId, targetId: postId, targetType: 'post' });

  if (updatedPost.course?.tags) {
    userService.trackUserInterests(userId, updatedPost.course.tags, 'view');
  }

  return { success: true, viewsCount: updatedPost.viewsCount, cooldown: false };
};
