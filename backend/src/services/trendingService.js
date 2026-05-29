import CompletedCourse from '../models/CompletedCourse.js';
import TrendingPost from '../models/TrendingPost.js';
import CacheControl from '../models/CacheControl.js';
import { ENGAGEMENT_WEIGHTS } from '../utils/engagement.js';

/**
 * REFRESH TRENDING CACHE
 * Aggregates high-engagement posts and stores them in TrendingPost collection.
 * Uses atomic pointer swap to eliminate empty windows.
 */
export const refreshTrendingCache = async () => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1h TTL
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // 1. Calculate Trending Posts
  const trendingCandidates = await CompletedCourse.aggregate([
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
            { $multiply: [{ $ifNull: ["$likesCount", 0] }, ENGAGEMENT_WEIGHTS.LIKE] },
            { $multiply: [{ $ifNull: ["$commentCount", 0] }, ENGAGEMENT_WEIGHTS.COMMENT] },
            { $multiply: [{ $ifNull: ["$viewsCount", 0] }, ENGAGEMENT_WEIGHTS.VIEW] }
          ]
        }
      }
    },
    { $sort: { trendingScore: -1 } },
    { $limit: 100 },
    {
      $lookup: {
        from: 'courses',
        localField: 'course',
        foreignField: '_id',
        as: 'courseDetails'
      }
    },
    { $unwind: '$courseDetails' }
  ]);

  // 2. Atomic Pointer Swap
  const batchId = Date.now().toString();
  
  const docs = trendingCandidates.map(c => ({
    postId: c._id,
    trendingScore: c.trendingScore,
    category: 'trending',
    tags: c.courseDetails.tags,
    platform: c.courseDetails.platform,
    batchId,
    expiresAt
  }));

  if (docs.length > 0) {
    // A) Insert new batch (hidden until pointer moves)
    await TrendingPost.insertMany(docs, { ordered: false });
    
    // B) Update Global Pointer
    await CacheControl.findOneAndUpdate(
      { key: 'trending_active_batch' },
      { activeValue: batchId, lastUpdated: now },
      { upsert: true }
    );
    
    // C) Lazy Cleanup (Background)
    setImmediate(async () => {
       try {
         // Wait for concurrent writes/reads to settle
         await new Promise(resolve => setTimeout(resolve, 5000));
         const activePointer = await CacheControl.findOne({ key: 'trending_active_batch' }).lean();
         if (activePointer) {
           await TrendingPost.deleteMany({ batchId: { $ne: activePointer.activeValue } });
         }
       } catch (e) {
         console.error('[TrendingService] Cleanup failed:', e.message);
       }
    });
  }

  console.log(`[TrendingService] Atomic pointer swap complete. Batch: ${batchId}`);
};

/**
 * Gets cached candidates from the active batch pointer
 */
export const getTrendingCandidates = async () => {
  const pointer = await CacheControl.findOne({ key: 'trending_active_batch' }).lean();
  
  if (!pointer) {
    await refreshTrendingCache();
    return await getTrendingCandidates();
  }
  
  let candidates = await TrendingPost.find({ batchId: pointer.activeValue }).lean();
  
  // If batch was partially cleaned up or empty, fallback
  if (candidates.length === 0) {
    await refreshTrendingCache();
    return await getTrendingCandidates();
  }
  
  return candidates;
};
