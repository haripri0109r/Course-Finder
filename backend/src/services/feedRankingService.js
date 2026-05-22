/**
 * ADVANCED FEED RANKING SERVICE
 * Handles modular scoring components for high-fidelity ranking.
 */

import { ENGAGEMENT_WEIGHTS } from '../utils/engagement.js';

export const RANKING_CONSTANTS = {
  WEIGHTS: {
    QUALITY_BASE: 5,
    QUALITY_RATING: 3,
    QUALITY_COMPLETIONS: 0.02,
    QUALITY_METADATA: 5,
    SOCIAL_FOLLOW: 30,
    SOCIAL_AFFINITY: 15,
    INTEREST_MATCH: 10,
    DISCOVERY_BOOST: 12,
    RECENCY_BOOST: 40 // High max boost for fresh content
  },
  FATIGUE: {
    CREATOR_PENALTY_STEP: 0.3, // Progressive penalty (1.0 -> 0.7 -> 0.4 -> 0.1)
    COURSE_PENALTY: 0.5       // Penalty if same course repeated
  }
};

/**
 * Generates the modular ranking aggregation pipeline.
 */
export const getFeedRankingPipeline = (userId, followingIds, userTags, affinityIds = [], discoveryMode = false) => {
  return [
    // 1. RECENCY SCORE (Time Decay)
    {
      $addFields: {
        hoursSince: {
          $divide: [{ $subtract: ["$$NOW", "$createdAt"] }, 3600000]
        }
      }
    },
    {
      $addFields: {
        recencyBoost: {
          $switch: {
            branches: [
              { case: { $lte: ["$hoursSince", 1] }, then: RANKING_CONSTANTS.WEIGHTS.RECENCY_BOOST },
              { case: { $lte: ["$hoursSince", 6] }, then: { $multiply: [RANKING_CONSTANTS.WEIGHTS.RECENCY_BOOST, 0.75] } },
              { case: { $lte: ["$hoursSince", 12] }, then: { $multiply: [RANKING_CONSTANTS.WEIGHTS.RECENCY_BOOST, 0.5] } },
              { case: { $lte: ["$hoursSince", 24] }, then: { $multiply: [RANKING_CONSTANTS.WEIGHTS.RECENCY_BOOST, 0.25] } },
              { case: { $lte: ["$hoursSince", 72] }, then: { $multiply: [RANKING_CONSTANTS.WEIGHTS.RECENCY_BOOST, 0.1] } }
            ],
            default: 0
          }
        }
      }
    },

    // 2. ENGAGEMENT SCORE (Weighted + Logarithmic Normalization)
    {
      $addFields: {
        rawEngagement: {
          $add: [
            { $multiply: [{ $ifNull: ["$likesCount", 0] }, ENGAGEMENT_WEIGHTS.LIKE] },
            { $multiply: [{ $ifNull: ["$commentCount", 0] }, ENGAGEMENT_WEIGHTS.COMMENT] },
            { $multiply: [{ $ifNull: ["$bookmarkCount", 0] }, ENGAGEMENT_WEIGHTS.BOOKMARK] },
            { $multiply: [{ $ifNull: ["$shareCount", 0] }, ENGAGEMENT_WEIGHTS.SHARE] },
            { $multiply: [{ $ifNull: ["$viewsCount", 0] }, ENGAGEMENT_WEIGHTS.VIEW] }
          ]
        }
      }
    },
    {
      $addFields: {
        // Engagement = log10(raw + 1) * multiplier to keep it in a healthy range
        engagementScore: {
          $multiply: [
            { $log10: { $add: ["$rawEngagement", 1] } },
            10
          ]
        }
      }
    },

    // 3. SOCIAL SCORE
    {
      $addFields: {
        isFollowed: { $in: ["$user", followingIds] },
        hasAffinity: { $in: ["$user", affinityIds] }
      }
    },
    {
      $addFields: {
        socialScore: {
          $add: [
            { $cond: ["$isFollowed", RANKING_CONSTANTS.WEIGHTS.SOCIAL_FOLLOW, 0] },
            { $cond: ["$hasAffinity", RANKING_CONSTANTS.WEIGHTS.SOCIAL_AFFINITY, 0] }
          ]
        }
      }
    },

    // 4. QUALITY SCORE
    {
      $addFields: {
        courseRating: { $ifNull: ["$courseDetails.averageRating", 0] },
        courseCompletions: { $ifNull: ["$courseDetails.totalCompletions", 0] },
        hasGoodMetadata: {
          $and: [
            { $ne: ["$courseDetails.title", null] },
            { $ne: ["$courseDetails.image", null] },
            { $ne: ["$courseDetails.image", ""] },
            { $ne: ["$courseDetails.image", "broken"] }
          ]
        }
      }
    },
    {
      $addFields: {
        qualityScore: {
          $add: [
            RANKING_CONSTANTS.WEIGHTS.QUALITY_BASE,
            { $multiply: ["$courseRating", RANKING_CONSTANTS.WEIGHTS.QUALITY_RATING] },
            { $multiply: ["$courseCompletions", RANKING_CONSTANTS.WEIGHTS.QUALITY_COMPLETIONS] },
            { $cond: ["$hasGoodMetadata", RANKING_CONSTANTS.WEIGHTS.QUALITY_METADATA, -15] }
          ]
        }
      }
    },

    // 5. INTEREST AFFINITY SCORE
    {
      $addFields: {
        courseTags: { $ifNull: ["$courseDetails.tags", []] },
        courseTitle: { $toLower: { $ifNull: ["$courseDetails.title", ""] } }
      }
    },
    {
      $addFields: {
        matchingTagsCount: {
          $size: { $setIntersection: ["$courseTags", userTags] }
        }
        // Potential future: keyword matching in title
      }
    },
    {
      $addFields: {
        interestScore: {
          $multiply: ["$matchingTagsCount", RANKING_CONSTANTS.WEIGHTS.INTEREST_MATCH]
        }
      }
    },

    // 6. DISCOVERY / EXPLORATION BLEND (DETERMINISTIC)
    {
      $addFields: {
        discoveryScore: {
          $cond: [
            discoveryMode,
            { 
              $add: [
                RANKING_CONSTANTS.WEIGHTS.DISCOVERY_BOOST,
                // Deterministic jitter based on popularity to maintain ordering
                { $multiply: [{ $log10: { $add: ["$courseDetails.totalCompletions", 1] } }, 2] }
              ]
            },
            0
          ]
        }
      }
    },

    // 7. FINAL SCORE AGGREGATION (ADDITIVE)
    {
      $addFields: {
        finalFeedScore: {
          $add: [
            "$engagementScore",
            "$socialScore",
            "$qualityScore",
            "$interestScore",
            "$discoveryScore",
            "$recencyBoost"
          ]
        }
      }
    }
  ];
};
