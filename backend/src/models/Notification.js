import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['follow', 'post_like', 'comment', 'reply', 'comment_like'],
      required: true,
    },
    targetType: {
      type: String,
      enum: ['post', 'comment', 'user'],
      required: true,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompletedCourse',
    },
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Performance Indexes
notificationSchema.index({ userId: 1, updatedAt: -1 });

// Anti-Spam / Deduplication Index (Partial & Compound)
// Prevents duplicate notifications from the same actor for the same target/type.
notificationSchema.index(
  {
    userId: 1,
    actorId: 1,
    postId: 1,
    commentId: 1,
    type: 1
  },
  {
    unique: true,
    partialFilterExpression: {
      userId: { $exists: true },
      actorId: { $exists: true }
    }
  }
);

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
