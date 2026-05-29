import mongoose from 'mongoose';

/**
 * USER PERSONALIZATION PROFILE
 * Stores persistent weighted interests and creator affinities.
 * Updated via profiling service by aggregating ActivityEvents.
 */
const interestSchema = new mongoose.Schema({
  topic: { type: String, required: true },
  score: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
}, { _id: false });

const affinitySchema = new mongoose.Schema({
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  score: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
}, { _id: false });

const userPersonalizationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    // Long-term interests (weighted)
    interests: [interestSchema],
    // Recent short-term intent (last 7 days)
    shortTermInterests: [interestSchema],
    // Creator relationships
    creatorAffinities: [affinitySchema],
    
    // Metadata for background refresh
    lastRefreshed: {
      type: Date,
      default: Date.now,
    }
  },
  {
    timestamps: true,
  }
);

const UserPersonalization = mongoose.model('UserPersonalization', userPersonalizationSchema);

export default UserPersonalization;
