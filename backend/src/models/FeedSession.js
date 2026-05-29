import mongoose from 'mongoose';

/**
 * FEED SESSION MODEL (B8.3)
 * Implements immutable feed session semantics to guarantee stable pagination
 * without unbounded array bloat.
 */
const feedSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sessionToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // Immutable snapshot of user profile at session start
    context: {
      followingIds: [mongoose.Schema.Types.ObjectId],
      interests: [{ topic: String, score: Number, _id: false }],
      shortTermInterests: [{ topic: String, score: Number, _id: false }],
      affinityScores: [{ creatorId: mongoose.Schema.Types.ObjectId, score: Number, _id: false }],
    },
    // The candidate queue holding the next pages of ranked items
    candidateQueue: [{
      id: mongoose.Schema.Types.ObjectId,
      sources: [String],
      _id: false
    }],
    // The time-based cursor for fetching the next batch from the database
    dbCursor: { 
      date: Date, 
      id: String 
    },
    isExhausted: {
      type: Boolean,
      default: false
    },
    // Track fatigue globally across the session (with bounds)
    fatigueState: {
      type: mongoose.Schema.Types.Mixed,
      default: { seenCreators: {}, seenCourses: {}, seenTopics: [] },
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // Auto-cleanup after TTL (e.g. 1 hour)
    }
  },
  {
    timestamps: true,
  }
);

const FeedSession = mongoose.model('FeedSession', feedSessionSchema);

export default FeedSession;
