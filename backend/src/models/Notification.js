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
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompletedCourse',
    },
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
    },
    type: {
      type: String,
      enum: ['post_like', 'comment', 'reply', 'follow'],
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

// Performance Index
notificationSchema.index({ userId: 1, updatedAt: -1 });

// Partial unique index for post notifications (post_like, comment)
notificationSchema.index(
  { userId: 1, actorId: 1, type: 1, postId: 1 },
  {
    unique: true,
    partialFilterExpression: { postId: { $exists: true } }
  }
);

// Partial unique index for comment notifications (reply)
notificationSchema.index(
  { userId: 1, actorId: 1, type: 1, commentId: 1 },
  {
    unique: true,
    partialFilterExpression: { commentId: { $exists: true } }
  }
);

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
