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
    INTEREST_ST_MULT: 15, // Multiplier for short-term match
    INTEREST_LT_MULT: 8,  // Multiplier for long-term match
    DISCOVERY_BOOST: 12,
    RECENCY_BOOST: 40,
  },
  FATIGUE: {
    CREATOR_PENALTY: 15, // Penalty if creator in seenCreators
    COURSE_PENALTY: 25,
    TOPIC_PENALTY: 10   // Per matching seenTopic
  },
  SOURCE_BOOSTS: {
    follow: 30,
    affinity: 20,
    interest_st: 25,
    interest_lt: 15,
    trending: 10,
    discovery: 5
  }
};

/**
 * PRODUCTION-GRADE RE-RANKING ENGINE
 * Features: Source Attribution Blending, Dual-Interest Weighting, Deterministic Fatigue.
 * @param {Object[]} candidates - Array of CompletedCourse docs with .sources array.
 * @param {Object} context
 */
export const rankCandidates = (candidates, {
  followingIds = [],
  interests = [],
  shortTermInterests = [],
  affinityScores = [],
  seenCreators = [], // Session context for fatigue
  seenCourses = [],
  seenTopics = []
}) => {
  const interestMap = new Map(interests.map(i => [i.topic, i.score]));
  const stInterestMap = new Map(shortTermInterests.map(i => [i.topic, i.score]));
  const affinityMap = new Map(affinityScores.map(a => [a.creatorId.toString(), a.score]));
  const followingSet = new Set(followingIds.map(id => id.toString()));

  const now = Date.now();

  const ranked = candidates.map(post => {
    const courseDetails = post.courseDetails || post.course || {};
    const tags = post.courseTags || courseDetails.tags || [];
    const creatorIdStr = post.user?.toString();
    const courseIdStr = (courseDetails._id || post.course)?.toString();

    // 1. RECENCY (Additive)
    const hoursSince = (now - new Date(post.createdAt).getTime()) / 3600000;
    let recencyBoost = 0;
    if (hoursSince <= 1) recencyBoost = RANKING_CONSTANTS.WEIGHTS.RECENCY_BOOST;
    else if (hoursSince <= 6) recencyBoost = RANKING_CONSTANTS.WEIGHTS.RECENCY_BOOST * 0.75;
    else if (hoursSince <= 12) recencyBoost = RANKING_CONSTANTS.WEIGHTS.RECENCY_BOOST * 0.5;
    else if (hoursSince <= 24) recencyBoost = RANKING_CONSTANTS.WEIGHTS.RECENCY_BOOST * 0.25;
    else if (hoursSince <= 72) recencyBoost = RANKING_CONSTANTS.WEIGHTS.RECENCY_BOOST * 0.1;

    // 2. ENGAGEMENT (Log-Normalized)
    const rawEngagement = 
      ((post.likesCount || 0) * ENGAGEMENT_WEIGHTS.LIKE) +
      ((post.commentCount || 0) * ENGAGEMENT_WEIGHTS.COMMENT) +
      ((post.bookmarkCount || 0) * ENGAGEMENT_WEIGHTS.BOOKMARK) +
      ((post.shareCount || 0) * ENGAGEMENT_WEIGHTS.SHARE) +
      ((post.viewsCount || 0) * ENGAGEMENT_WEIGHTS.VIEW);
    
    const engagementScore = Math.log10(rawEngagement + 1) * 10;

    // 3. SOCIAL (Following + Affinity)
    const isFollowed = followingSet.has(creatorIdStr);
    const affinityScoreVal = affinityMap.get(creatorIdStr) || 0;
    const socialScore = 
      (isFollowed ? RANKING_CONSTANTS.WEIGHTS.SOCIAL_FOLLOW : 0) +
      (affinityScoreVal > 0 ? affinityScoreVal : 0);

    // 4. QUALITY (Denormalized or Fetched)
    const rating = post.courseRating || courseDetails.averageRating || 0;
    const completions = post.courseCompletions || courseDetails.totalCompletions || 0;
    const hasGoodMetadata = !!(post.courseTitle && (post.courseImage || courseDetails.image));
    
    const qualityScore = RANKING_CONSTANTS.WEIGHTS.QUALITY_BASE +
      (rating * RANKING_CONSTANTS.WEIGHTS.QUALITY_RATING) +
      (completions * RANKING_CONSTANTS.WEIGHTS.QUALITY_COMPLETIONS) +
      (hasGoodMetadata ? 0 : -25);

    // 5. INTEREST Match (Short-term vs Long-term)
    let interestScore = 0;
    for (const tag of tags) {
      if (stInterestMap.has(tag)) {
        interestScore += (stInterestMap.get(tag) * RANKING_CONSTANTS.WEIGHTS.INTEREST_ST_MULT);
      }
      if (interestMap.has(tag)) {
        interestScore += (interestMap.get(tag) * RANKING_CONSTANTS.WEIGHTS.INTEREST_LT_MULT);
      }
    }

    // 6. SOURCE Blending (Preserves attribution)
    let sourceScore = 0;
    post.sources.forEach(src => {
      sourceScore += (RANKING_CONSTANTS.SOURCE_BOOSTS[src] || 0);
    });

    // 7. DETERMINISTIC FATIGUE
    let fatiguePenalty = 0;
    if (seenCreators.includes(creatorIdStr)) fatiguePenalty += RANKING_CONSTANTS.FATIGUE.CREATOR_PENALTY;
    if (seenCourses.includes(courseIdStr)) fatiguePenalty += RANKING_CONSTANTS.FATIGUE.COURSE_PENALTY;
    
    const matchingSeenTopics = tags.filter(t => seenTopics.includes(t));
    fatiguePenalty += (matchingSeenTopics.length * RANKING_CONSTANTS.FATIGUE.TOPIC_PENALTY);

    // FINAL DETERMINISTIC SCORE
    const finalFeedScore = engagementScore + socialScore + qualityScore + interestScore + sourceScore + recencyBoost - fatiguePenalty;

    return {
      ...post,
      finalFeedScore,
      engagementScore
    };
  });

  // Mathematically Stable Sort: Score DESC, then Date DESC, then ID DESC
  ranked.sort((a, b) => {
    if (b.finalFeedScore !== a.finalFeedScore) return b.finalFeedScore - a.finalFeedScore;
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    if (dateB !== dateA) return dateB - dateA;
    return b._id.toString().localeCompare(a._id.toString());
  });
  
  return ranked;
};
