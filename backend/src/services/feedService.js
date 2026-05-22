import mongoose from 'mongoose';
import { CompletedCourse, ActivityEvent, User } from '../models/index.js';
import { PAGINATION_LIMIT } from '../config/constants.js';
import { formatCourse } from '../utils/formatter.js';
import * as userService from './userService.js';
import { trackEvent } from './activityService.js';
import { getFeedRankingPipeline, RANKING_CONSTANTS } from './feedRankingService.js';

/**
 * ENHANCED STABLE CURSOR HELPERS
 * Encodes: { score, createdAt, id }
 */
const encodeCursor = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64');
const decodeCursor = (str) => {
  try {
    const decoded = JSON.parse(Buffer.from(str, 'base64').toString('utf8'));
    return {
      score: decoded.score,
      createdAt: new Date(decoded.createdAt),
      id: decoded.id
    };
  } catch (e) {
    return null;
  }
};

/**
 * PRODUCTION-GRADE SMART FEED SERVICE
 * Handles hybrid ranking aggregation, stable cursor pagination, and iterative refill.
 */

export const getSmartFeed = async (userId, cursor = null, limit = PAGINATION_LIMIT) => {
  try {
    // 1. Fetch User Personalization Profile & Negative Feedback
    const user = await User.findById(userId)
      .select('following interests likedTags viewedTags hiddenPosts mutedUsers')
      .lean();
    
    const followingIds = user?.following || [];
    const hiddenPosts = user?.hiddenPosts || [];
    const mutedUsers = user?.mutedUsers || [];
    
    // 1.1 Social Affinity (30d)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentInteractions = await ActivityEvent.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: thirtyDaysAgo },
          eventType: { $in: ['bookmark_save', 'post_share', 'course_open', 'follow_user'] }
        }
      },
      {
        $lookup: {
          from: 'completedcourses',
          localField: 'targetId',
          foreignField: '_id',
          as: 'post'
        }
      },
      { $unwind: { path: '$post', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$post.user',
          interactionCount: { $sum: 1 }
        }
      },
      { $match: { _id: { $ne: null } } },
      { $sort: { interactionCount: -1 } },
      { $limit: 25 }
    ]);
    const affinityIds = recentInteractions.map(i => i._id);

    // 1.2 Enhanced Interest Tags
    const recentActivityEvents = await ActivityEvent.find({
      userId,
      createdAt: { $gte: thirtyDaysAgo },
      eventType: { $in: ['search_query', 'course_open', 'bookmark_save'] }
    }).limit(100).lean();

    const activityTags = [];
    recentActivityEvents.forEach(event => {
      if (event.metadata?.tags) activityTags.push(...event.metadata.tags);
      if (event.metadata?.query) activityTags.push(event.metadata.query);
    });

    const preferenceTags = [
      ...(user?.interests || []),
      ...(user?.likedTags || []),
      ...(user?.viewedTags || []),
      ...activityTags
    ];
    const userTags = [...new Set(preferenceTags.map(t => t.toLowerCase().trim()))].slice(0, 200);

    // 2. Base Query Construction (Negative Feedback Filters)
    const matchQuery = { 
      isPublic: true,
      _id: { $nin: hiddenPosts },
      user: { $nin: mutedUsers }
    };
    
    // 3. Handle Stable Cursor Pagination (DEFERRED: Will be applied after scoring)
    const clientCursor = cursor ? decodeCursor(cursor) : null;
    let workingCursor = clientCursor; // Internal refill cursor

    // 4. Iterative Refill Loop
    const diverseItems = [];
    const creatorCounts = {};
    const courseCounts = {};
    let lastEvaluatedItem = null;
    let iteration = 0;
    const maxIterations = 5; 
    const batchSize = limit * 3; 
    let skipCount = 0; 

    while (diverseItems.length < limit && iteration < maxIterations) {
      iteration++;

      // A) Generate Ranking Pipeline (30% Discovery Blend)
      const isDiscoveryBatch = iteration % 3 === 0; 
      const pipeline = [
        { $match: matchQuery },
        {
          $lookup: {
            from: 'courses',
            localField: 'course',
            foreignField: '_id',
            pipeline: [{ $project: { tags: 1, title: 1, platform: 1, image: 1, averageRating: 1, totalCompletions: 1 } }],
            as: 'courseDetails'
          }
        },
        { $unwind: { path: '$courseDetails', preserveNullAndEmptyArrays: true } },
        ...getFeedRankingPipeline(userId, followingIds, userTags, affinityIds, isDiscoveryBatch),
        
        // B) Apply Cursor Filter (AFTER scoring)
        ...(workingCursor ? [{
          $match: {
            $or: [
              { finalFeedScore: { $lt: workingCursor.score } },
              { 
                $and: [
                  { finalFeedScore: { $eq: workingCursor.score } },
                  { createdAt: { $lt: workingCursor.createdAt } }
                ]
              },
              { 
                $and: [
                  { finalFeedScore: { $eq: workingCursor.score } },
                  { createdAt: { $eq: workingCursor.createdAt } },
                  { _id: { $lt: new mongoose.Types.ObjectId(workingCursor.id) } }
                ]
              }
            ]
          }
        }] : []),

        { $sort: { finalFeedScore: -1, createdAt: -1, _id: -1 } },
        { $skip: skipCount },
        { $limit: batchSize }
      ];

      const candidates = await CompletedCourse.aggregate(pipeline);
      if (candidates.length === 0) break; 

      for (const item of candidates) {
        const creatorIdStr = item.user.toString();
        const courseIdStr = item.course.toString();
        
        const creatorCount = creatorCounts[creatorIdStr] || 0;
        const courseCount = courseCounts[courseIdStr] || 0;

        // Progressive Fatigue / Diversity
        if (creatorCount < 2 && courseCount < 2) {
          diverseItems.push(item);
          creatorCounts[creatorIdStr] = creatorCount + 1;
          courseCounts[courseIdStr] = courseCount + 1;
        }

        lastEvaluatedItem = item;
        if (diverseItems.length === limit) break;
      }

      // D) Advance Pagination for Next Iteration
      if (diverseItems.length < limit && lastEvaluatedItem) {
        workingCursor = {
          score: lastEvaluatedItem.finalFeedScore,
          createdAt: lastEvaluatedItem.createdAt,
          id: lastEvaluatedItem._id.toString()
        };
        skipCount = 0; 
      }
    }

    // 5. Cold Start Intelligence (Fallback)
    if (diverseItems.length === 0 && !cursor) {
      console.log("Feed Cold Start: Blending Popular/High-Quality FALLBACK");
      const fallbackItems = await CompletedCourse.aggregate([
        { $match: { isPublic: true } },
        {
          $lookup: {
            from: 'courses',
            localField: 'course',
            foreignField: '_id',
            pipeline: [{ $project: { tags: 1, title: 1, platform: 1, image: 1, averageRating: 1, totalCompletions: 1 } }],
            as: 'courseDetails'
          }
        },
        { $unwind: '$courseDetails' },
        {
          $addFields: {
            finalFeedScore: {
              $add: [
                { $multiply: ["$courseDetails.averageRating", 10] },
                { $multiply: [{ $log10: { $add: ["$viewsCount", 1] } }, 5] }
              ]
            }
          }
        },
        { $sort: { finalFeedScore: -1, _id: -1 } },
        { $limit: limit }
      ]);
      diverseItems.push(...fallbackItems);
    }

    // 6. Population & Formatting
    const populated = await CompletedCourse.populate(diverseItems, [
      { path: 'user', select: 'name profilePicture' }
    ]);

    const posts = populated.map(item => {
      const finalItem = {
        ...item,
        course: item.courseDetails || item.course
      };
      return formatCourse(finalItem, userId);
    });

    // 7. Stable Cursor Generation
    let nextCursor = null;
    if (diverseItems.length === limit && lastEvaluatedItem) {
      nextCursor = encodeCursor({
        score: lastEvaluatedItem.finalFeedScore,
        createdAt: lastEvaluatedItem.createdAt,
        id: lastEvaluatedItem._id
      });
    }

    return { posts, nextCursor };
  } catch (error) {
    console.error('getSmartFeed Fatal Error:', error);
    return { posts: [], nextCursor: null };
  }
};

/**
 * Fetches the most viewed/liked completions in the last 24 hours.
 */
export const getTrendingCompletions = async (userId) => {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const pipeline = [
    { 
      $match: { 
        isPublic: true, 
        createdAt: { $gte: twentyFourHoursAgo } 
      } 
    },
    {
      $addFields: {
        trendingScore: {
          $add: [
            { $multiply: [{ $ifNull: ["$likesCount", 0] }, 2] },
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

  const data = populated.map(item => formatCourse(item, userId));

  return {
    success: true,
    data,
  };
};

/**
 * Atomic view tracking with a 6-hour cooldown and interest tracking.
 */
export const trackUniqueView = async (userId, postId) => {
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    throw new Error('Invalid post ID');
  }

  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

  // Check for recent view by this user (Backward compatible check)
  const recentEvent = await ActivityEvent.findOne({
    eventType: { $in: ['view', 'course_open'] },
    userId,
    targetId: postId,
    createdAt: { $gte: sixHoursAgo }
  }).lean();

  if (recentEvent) {
    // Cooldown active
    const post = await CompletedCourse.findById(postId).select('viewsCount').lean();
    return { success: true, viewsCount: post?.viewsCount || 0, cooldown: true };
  }

  // Increment view
  const updatedPost = await CompletedCourse.findByIdAndUpdate(
    postId,
    { $inc: { viewsCount: 1 } },
    { new: true }
  ).populate('course', 'tags');

  if (!updatedPost) {
    throw new Error('Post not found');
  }

  // Persist interaction (Standardized to course_open)
  trackEvent({
    eventType: 'course_open',
    userId,
    targetId: postId,
    targetType: 'course_completion'
  });

  // Track Interest Based on Viewing Course (Async)
  if (updatedPost.course?.tags) {
    userService.trackUserInterests(userId, updatedPost.course.tags, 'view');
  }

  return { 
    success: true, 
    viewsCount: updatedPost.viewsCount, 
    cooldown: false 
  };
};
