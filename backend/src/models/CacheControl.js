import mongoose from 'mongoose';

/**
 * CACHE CONTROL MODEL
 * Stores global pointers for atomic swaps (e.g. current trending batch).
 */
const cacheControlSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // The active batch ID or version
    activeValue: {
      type: String,
      required: true,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    }
  },
  {
    timestamps: true,
  }
);

const CacheControl = mongoose.model('CacheControl', cacheControlSchema);

export default CacheControl;
