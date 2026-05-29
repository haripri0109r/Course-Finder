import mongoose from 'mongoose';

/**
 * TRENDING CANDIDATE CACHE
 * Pre-computed high-engagement posts for discovery blending.
 * Refreshed periodically (e.g. every 15 mins).
 */
const trendingPostSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompletedCourse',
      required: true,
    },
    // Pre-calculated trending score for fast retrieval
    trendingScore: {
      type: Number,
      default: 0,
      index: true,
    },
    // Type of candidate: 'trending', 'popular', 'fresh'
    category: {
      type: String,
      enum: ['trending', 'popular', 'fresh', 'quality'],
      default: 'trending',
      index: true,
    },
    // Metadata for filtering
    tags: [String],
    platform: String,
    // Batch identification for atomic swap
    batchId: {
      type: String,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    }
  },
  {
    timestamps: true,
  }
);

// Allow post to exist in different batches during swap
trendingPostSchema.index({ postId: 1, batchId: 1 }, { unique: true });

// TTL Index for automatic cleanup
trendingPostSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const TrendingPost = mongoose.model('TrendingPost', trendingPostSchema);

export default TrendingPost;
