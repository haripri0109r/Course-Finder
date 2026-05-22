import mongoose from 'mongoose';

const activityEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      enum: [
        // Canonical (New)
        'feed_impression', 
        'course_open', 
        'bookmark_save', 
        'follow_user', 
        'post_share', 
        'search_query',
        'hide_post',
        'not_interested',
        'mute_user',
        
        // Legacy (Backward Compatibility)
        'impression',
        'click',
        'share',
        'search',
        'save',
        'follow',
        'view',
        'dwell'
      ],
      index: true,
    },
    targetId: {
      type: String, // Kept as string to support different entity types seamlessly
      default: null,
      index: true,
    },
    targetType: {
      type: String,
      default: 'unknown',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Performance index for deduplication and feeds
activityEventSchema.index({ userId: 1, eventType: 1, targetId: 1, createdAt: -1 });

export default mongoose.model('ActivityEvent', activityEventSchema);
