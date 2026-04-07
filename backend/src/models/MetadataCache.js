import mongoose from 'mongoose';

const metadataCacheSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    default: '',
  },
  duration: {
    type: String,
    default: 'N/A',
  },
  provider: {
    type: String,
    default: 'Unknown',
  },
  cachedAt: {
    type: Date,
    default: Date.now,
  }
});

// TTL Index: Automatically delete documents 24 hours after cachedAt
metadataCacheSchema.index({ cachedAt: 1 }, { expireAfterSeconds: 86400 });

const MetadataCache = mongoose.model('MetadataCache', metadataCacheSchema);

export default MetadataCache;
