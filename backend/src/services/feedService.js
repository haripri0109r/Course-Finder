import mongoose from 'mongoose';
import { CompletedCourse, AnalyticsEvent, User } from '../models/index.js';
import { PAGINATION_LIMIT } from '../config/constants.js';
import { formatCourse } from '../utils/formatter.js';
import * as userService from './userService.js';

/**
 * PRODUCTION-GRADE FEED SERVICE
 * Handles hybrid ranking aggregation, cursor pagination, and engagement tracking.
 */

/**
 * Fetches a personalized, hybrid-ranked feed.
 * 70% Personalized (Interests + Follows) | 30% Discovery (Trending)
 */
export const getSmartFeed = async (userId, cursor = null, limit = PAGINATION_LIMIT) => {
  try {
    // 1. Fetch User Personalization Profile
    const user = await User.findById(userId).select('following interests likedTags viewedTags');
    const followingIds = user?.following || [];
    const preferenceTags = [
      ...(user?.interests || []),
      ...(user?.likedTags || []),
      ...(user?.viewedTags || [])
    ];
    // Unique set of interests
    const userTags = [...new Set(preferenceTags.map(t => t.toLowerCase()))].slice(0, 100);

    const matchQuery = { isPublic: true };
    if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
      matchQuery._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    const pipeline = [
      { $match: matchQuery },
      // Join with course to get tags
      {
        $lookup: {
          from: 'courses',
          localField: 'course',
          foreignField: '_id',
          as: 'courseDetails'
        }
      },
      { $unwind: '$courseDetails' },
      // Compute Base Metrics
      {
        $addFields: {
          likesCount: { $size: { $ifNull: ["$likes", []] } },
          hoursSince: {
            $divide: [{ $subtract: ["$$NOW", "$createdAt"] }, 3600000]
          },
          isFollowed: { $in: ["$user", followingIds] },
          courseTags: { $ifNull: ["$courseDetails.tags", []] }
        }
      },
      {
        $addFields: {
          recencyBoost: { $max: [0, { $subtract: [100, "$hoursSince"] }] },
          matchingTags: {
            $size: { $setIntersection: ["$courseTags", userTags] }
          }
        }
      },
      // Calculate Factors
      {
        $addFields: {
          baseScore: {
            $add: [
              { $multiply: ["$likesCount", 2] },
              { $ifNull: ["$viewsCount", 0] },
              "$recencyBoost"
            ]
          },
          personalizationFactor: {
            $add: [1, { $multiply: ["$matchingTags", 0.3] }]
          },
          followBoost: {
            $cond: ["$isFollowed", 1.5, 1.0]
          }
        }
      },
      {
        $addFields: {
          finalPersonalizedScore: {
            $multiply: ["$baseScore", "$personalizationFactor", "$followBoost"]
          }
        }
      },
      // Hybrid Stream Split (70 Personalized / 30 Discovery)
      {
        $facet: {
          personalized: [
            { $sort: { finalPersonalizedScore: -1, _id: -1 } },
            { $limit: Math.ceil(limit * 0.7) }
          ],
          discovery: [
            { $sort: { baseScore: -1, _id: -1 } },
            { $limit: Math.ceil(limit * 0.3) }
          ]
        }
      },
      // Merge and Interleave
      {
        $project: {
          combined: { $setUnion: ["$personalized", "$discovery"] }
        }
      },
      { $unwind: "$combined" },
      { $replaceRoot: { newRoot: "$combined" } },
      // Final global sort to keep feed somewhat ordered even after merge
      { $sort: { finalPersonalizedScore: -1, _id: -1 } },
      { $limit: limit }
    ];

    const items = await CompletedCourse.aggregate(pipeline);

    // Populate post metadata
    const populated = await CompletedCourse.populate(items, [
      { path: 'user', select: 'name profilePicture' },
      { path: 'course', select: 'title platform url tags level averageRating totalCompletions image' }
    ]);

    const data = populated.map(item => formatCourse(item, userId));

    return {
      success: true,
      data,
      nextCursor: data.length > 0 ? data[data.length - 1].id : null,
      hasMore: data.length === limit,
    };
  } catch (error) {
    console.error('SmartFeed Error:', error);
    throw error;
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
            { $multiply: [{ $size: { $ifNull: ["$likes", []] } }, 2] },
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

  // Check for recent view by this user
  const recentEvent = await AnalyticsEvent.findOne({
    event: 'post_view',
    userId,
    relatedPostId: postId,
    timestamp: { $gte: sixHoursAgo }
  });

  if (recentEvent) {
    // Cooldown active
    const post = await CompletedCourse.findById(postId).select('viewsCount');
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

  // Persist interaction
  await AnalyticsEvent.create({
    event: 'post_view',
    userId,
    relatedPostId: postId,
    timestamp: new Date()
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
