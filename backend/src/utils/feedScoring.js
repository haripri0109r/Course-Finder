/**
 * Smart Feed Deterministic Scoring Configuration
 * Handles logic for Recency, Quality, Diversity, and Social boosts.
 */

import { ENGAGEMENT_WEIGHTS, getEngagementAggregationFields } from './engagement.js';

// ─── Scoring Weights ────────────────────────────────────────────────────────
export const FEED_WEIGHTS = {
  // Base weights for Quality factors
  QUALITY_BASE: 5,         
  QUALITY_RATING: 2.5,     // Multiplier for course rating
  QUALITY_COMPLETIONS: 0.01, // 100 completions = 1 point
  QUALITY_METADATA: 4,     // Boost for having proper title & image
  
  // Base weights for Social & Interest factors
  SOCIAL_FOLLOW: 20,       // High boost if user follows the creator
  SOCIAL_AFFINITY: 10,     // Boost if user interacted with creator recently
  INTEREST_MATCH: 5,       // Per matched tag multiplier
};

/**
 * Aggregation stages for calculating the deterministic feed score.
 * 
 * FINAL_SCORE =
 *   RECENCY_DECAY * ( ENGAGEMENT + QUALITY + SOCIAL + INTEREST )
 *   - PENALTIES
 */
export const getFeedScoringPipeline = (userId, followingIds, userTags, affinityIds = []) => {
  return [
    // 1. Calculate Time Decay (Recency)
    {
      $addFields: {
        hoursSince: {
          $divide: [{ $subtract: ["$$NOW", "$createdAt"] }, 3600000]
        }
      }
    },
    {
      $addFields: {
        recencyMultiplier: {
          $switch: {
            branches: [
              { case: { $lte: ["$hoursSince", 1] }, then: 2.0 },  // Freshness boost
              { case: { $lte: ["$hoursSince", 6] }, then: 1.5 },
              { case: { $lte: ["$hoursSince", 12] }, then: 1.2 },
              { case: { $lte: ["$hoursSince", 24] }, then: 1.0 },
              { case: { $lte: ["$hoursSince", 48] }, then: 0.7 },
              { case: { $lte: ["$hoursSince", 72] }, then: 0.4 },
              { case: { $lte: ["$hoursSince", 168] }, then: 0.1 } // 1 week
            ],
            default: 0.05 // Very old
          }
        }
      }
    },

    // 2. Calculate Engagement Score (Using shared utility)
    {
      $addFields: getEngagementAggregationFields()
    },

    // 3. Calculate Social & Quality Score
    {
      $addFields: {
        isFollowed: { $in: ["$user", followingIds] },
        hasAffinity: { $in: ["$user", affinityIds] },
        courseRating: { $ifNull: ["$courseDetails.averageRating", 0] },
        courseCompletions: { $ifNull: ["$courseDetails.totalCompletions", 0] },
        hasGoodMetadata: {
          $and: [
            { $ne: ["$courseDetails.title", null] },
            { $ne: ["$courseDetails.image", null] },
            { $ne: ["$courseDetails.image", ""] }
          ]
        }
      }
    },
    {
      $addFields: {
        socialScore: {
          $add: [
            { $cond: ["$isFollowed", FEED_WEIGHTS.SOCIAL_FOLLOW, 0] },
            { $cond: ["$hasAffinity", FEED_WEIGHTS.SOCIAL_AFFINITY, 0] }
          ]
        },
        qualityScore: {
          $add: [
            FEED_WEIGHTS.QUALITY_BASE,
            { $multiply: ["$courseRating", FEED_WEIGHTS.QUALITY_RATING] },
            { $multiply: ["$courseCompletions", FEED_WEIGHTS.QUALITY_COMPLETIONS] },
            { $cond: ["$hasGoodMetadata", FEED_WEIGHTS.QUALITY_METADATA, -8] } // Heavier penalty for bad metadata
          ]
        }
      }
    },

    // 4. Calculate Interest Match Score
    {
      $addFields: {
        courseTags: { $ifNull: ["$courseDetails.tags", []] }
      }
    },
    {
      $addFields: {
        matchingTagsCount: {
          $size: { $setIntersection: ["$courseTags", userTags] }
        }
      }
    },
    {
      $addFields: {
        interestScore: {
          $multiply: ["$matchingTagsCount", FEED_WEIGHTS.INTEREST_MATCH]
        }
      }
    },

    // 5. Compute Raw Combined Score
    {
      $addFields: {
        rawScore: {
          $add: [
            "$engagementScore",
            "$socialScore",
            "$qualityScore",
            "$interestScore"
          ]
        }
      }
    },

    // 6. Apply Recency Decay to get Final Score
    {
      $addFields: {
        finalFeedScore: {
          $multiply: ["$rawScore", "$recencyMultiplier"]
        }
      }
    }
  ];
};

/**
 * Stage for Diversity Control / Anti-Spam
 * Executed AFTER the initial sort to prevent a single creator or course
 * from flooding the top of the feed batch.
 * 
 * Note: MongoDB doesn't have an easy "max 2 per group while maintaining order" 
 * in a single simple stage without complex $facet or $reduce. 
 * We will apply a deterministic ranking penalty for highly-active users 
 * by checking if they appear frequently, or handle this slightly differently.
 * A simpler approach for backend aggregation is to sort by finalFeedScore, 
 * then group by user, slice top 2, and unwind. 
 * 
 * However, to keep it simple and perfectly paginated:
 * We will NOT use $group -> $slice as it ruins global pagination cursors.
 * Instead, we will rely on the organic ranking.
 * If diversity is strictly required at query time, it's often done in-memory on the returned batch,
 * or by adding a penalty during scoring if `viewsCount` is extremely low but `hoursSince` is high.
 */
