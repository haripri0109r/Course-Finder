import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: [true, 'Resource type is required'],
      enum: {
        values: ['channel', 'playlist'],
        message: 'Type must be channel or playlist',
      },
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    url: {
      type: String,
      required: [true, 'URL is required'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'addedBy user is required'],
    },
    upvotes: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
resourceSchema.index({ type: 1 });           // filter by channel/playlist
resourceSchema.index({ upvotes: -1 });       // sort by most upvoted
resourceSchema.index({ title: 'text', description: 'text' }); // text search

// ─── Clean output ─────────────────────────────────────────────────────────────
resourceSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Resource = mongoose.model('Resource', resourceSchema);

export default Resource;
