import mongoose from 'mongoose';
import { CompletedCourse } from '../models/index.js';
import { getTrendingCandidates } from './trendingService.js';

export const QUOTAS = {
  FOLLOW: 0.35,     
  AFFINITY: 0.15,   
  INTEREST_ST: 0.20, // Short-term intent
  INTEREST_LT: 0.10, // Long-term preference
  TRENDING: 0.10,   
  DISCOVERY: 0.10   
};

export const MAX_CANDIDATES = 200;

/**
 * PRODUCTION-GRADE CANDIDATE RETRIEVAL
 * Features: Multi-source, Dedupe with Attribution, Quota Rebalancing, No Hot Joins.
 */
export const getCandidates = async (userId, userProfile, followingIds, mutedUsers, dbCursor, limit = 60) => {
  const userObjId = new mongoose.Types.ObjectId(userId);
  const mutedObjIds = (mutedUsers || []).map(id => new mongoose.Types.ObjectId(id));

  const baseMatch = {
    isPublic: true,
    isRemoved: false,
    user: { $nin: [userObjId, ...mutedObjIds] }
  };
  
  if (dbCursor && dbCursor.date) {
    baseMatch.$or = [
      { createdAt: { $lt: new Date(dbCursor.date) } },
      { 
        createdAt: new Date(dbCursor.date), 
        _id: { $lt: new mongoose.Types.ObjectId(dbCursor.id) } 
      }
    ];
  }

  const isColdStart = !userProfile || ((userProfile.interests || []).length === 0 && (userProfile.creatorAffinities || []).length === 0);
  
  const activeQuotas = isColdStart ? {
    TRENDING: 0.50,
    DISCOVERY: 0.50,
    FOLLOW: 0, AFFINITY: 0, INTEREST_ST: 0, INTEREST_LT: 0
  } : QUOTAS;

  const poolPromises = [];
  const retrievalLimit = MAX_CANDIDATES; 

  const followingObjIds = followingIds.map(id => new mongoose.Types.ObjectId(id));

  // 1. Follow Graph
  if (activeQuotas.FOLLOW > 0 && followingIds.length > 0) {
    const qLimit = Math.ceil(retrievalLimit * activeQuotas.FOLLOW);
    poolPromises.push(
      CompletedCourse.find({ ...baseMatch, user: { $in: followingObjIds } })
        .sort({ createdAt: -1 })
        .limit(qLimit)
        .lean()
        .then(res => res.map(item => ({ ...item, source: 'follow' })))
    );
  } else poolPromises.push(Promise.resolve([]));

  // 2. Creator Affinity (Non-followed)
  if (activeQuotas.AFFINITY > 0 && userProfile?.creatorAffinities?.length > 0) {
    const affinityIds = userProfile.creatorAffinities
      .filter(a => !followingIds.includes(a.creatorId.toString()))
      .slice(0, 20)
      .map(a => new mongoose.Types.ObjectId(a.creatorId));
    
    if (affinityIds.length > 0) {
      const qLimit = Math.ceil(retrievalLimit * activeQuotas.AFFINITY);
      poolPromises.push(
        CompletedCourse.find({ ...baseMatch, user: { $in: affinityIds } })
          .sort({ createdAt: -1 })
          .limit(qLimit)
          .lean()
          .then(res => res.map(item => ({ ...item, source: 'affinity' })))
      );
    } else poolPromises.push(Promise.resolve([]));
  } else poolPromises.push(Promise.resolve([]));

  // 3. Short-term Interest Match
  if (activeQuotas.INTEREST_ST > 0 && userProfile?.shortTermInterests?.length > 0) {
    const stTags = userProfile.shortTermInterests.slice(0, 5).map(i => i.topic);
    const qLimit = Math.ceil(retrievalLimit * activeQuotas.INTEREST_ST);
    poolPromises.push(
      CompletedCourse.find({ ...baseMatch, courseTags: { $in: stTags } })
        .sort({ createdAt: -1 })
        .limit(qLimit)
        .lean()
        .then(res => res.map(item => ({ ...item, source: 'interest_st' })))
    );
  } else poolPromises.push(Promise.resolve([]));

  // 4. Long-term Interest Match
  if (activeQuotas.INTEREST_LT > 0 && userProfile?.interests?.length > 0) {
    const ltTags = userProfile.interests.slice(0, 10).map(i => i.topic);
    const qLimit = Math.ceil(retrievalLimit * activeQuotas.INTEREST_LT);
    poolPromises.push(
      CompletedCourse.find({ ...baseMatch, courseTags: { $in: ltTags } })
        .sort({ createdAt: -1 })
        .limit(qLimit)
        .lean()
        .then(res => res.map(item => ({ ...item, source: 'interest_lt' })))
    );
  } else poolPromises.push(Promise.resolve([]));

  // 5. Trending Cache
  if (activeQuotas.TRENDING > 0) {
    const qLimit = Math.ceil(retrievalLimit * activeQuotas.TRENDING);
    poolPromises.push(
      (async () => {
        const trending = await getTrendingCandidates();
        const trendingIds = trending.slice(0, qLimit * 2).map(t => t.postId);
        return await CompletedCourse.find({ ...baseMatch, _id: { $in: trendingIds } })
          .limit(qLimit)
          .lean()
          .then(res => res.map(item => ({ ...item, source: 'trending' })));
      })()
    );
  } else poolPromises.push(Promise.resolve([]));

  // 6. Deterministic Discovery (Novelty + Quality)
  if (activeQuotas.DISCOVERY > 0) {
    const qLimit = Math.ceil(retrievalLimit * activeQuotas.DISCOVERY);
    const discMatch = { 
      ...baseMatch, 
      user: { $nin: [...followingObjIds, userObjId, ...mutedObjIds] }, // Novelty + Muted Exclusion
      courseRating: { $gte: 4.0 }, 
      viewsCount: { $gt: 5 } 
    };
    poolPromises.push(
      CompletedCourse.find(discMatch)
      .sort({ createdAt: -1, viewsCount: -1 })
      .limit(qLimit)
      .lean()
      .then(res => res.map(item => ({ ...item, source: 'discovery' })))
    );
  } else poolPromises.push(Promise.resolve([]));

  // Execute Parallel Retrieval
  const rawPools = await Promise.all(poolPromises);

  // DEDUPLICATION & SOURCE ATTRIBUTION PRESERVATION
  const candidateMap = new Map();
  rawPools.flat().forEach(c => {
    const idStr = c._id.toString();
    if (candidateMap.has(idStr)) {
      const existing = candidateMap.get(idStr);
      if (!existing.sources.includes(c.source)) {
        existing.sources.push(c.source);
      }
    } else {
      candidateMap.set(idStr, { ...c, sources: [c.source] });
    }
  });

  return Array.from(candidateMap.values());
};
