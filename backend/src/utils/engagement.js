/**
 * Engagement Scoring Utilities for Feed 2.0
 * Provides canonical weights for user interactions.
 */

export const ENGAGEMENT_WEIGHTS = {
  LIKE: 5,
  COMMENT: 10,
  BOOKMARK: 15,
  SHARE: 20,
  VIEW: 1,
};

/**
 * Calculates raw engagement score for a post or course.
 */
export const calculateEngagementScore = ({ likes = 0, comments = 0, bookmarks = 0, shares = 0, views = 0 }) => {
  return (
    likes * ENGAGEMENT_WEIGHTS.LIKE +
    comments * ENGAGEMENT_WEIGHTS.COMMENT +
    bookmarks * ENGAGEMENT_WEIGHTS.BOOKMARK +
    shares * ENGAGEMENT_WEIGHTS.SHARE +
    views * ENGAGEMENT_WEIGHTS.VIEW
  );
};

/**
 * Helper to generate recommendation scoring inputs for aggregation pipelines.
 */
export const getEngagementAggregationFields = () => {
  return {
    engagementScore: {
      $add: [
        { $multiply: [{ $ifNull: ["$likesCount", 0] }, ENGAGEMENT_WEIGHTS.LIKE] },
        { $multiply: [{ $ifNull: ["$commentCount", 0] }, ENGAGEMENT_WEIGHTS.COMMENT] },
        { $multiply: [{ $ifNull: ["$bookmarkCount", 0] }, ENGAGEMENT_WEIGHTS.BOOKMARK] },
        { $multiply: [{ $ifNull: ["$shareCount", 0] }, ENGAGEMENT_WEIGHTS.SHARE] },
        { $multiply: [{ $ifNull: ["$viewsCount", 0] }, ENGAGEMENT_WEIGHTS.VIEW] }
      ]
    }
  };
};
