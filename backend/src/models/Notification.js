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
      enum: ['like', 'comment', 'reply', 'comment_like', 'follow', 'post_like'], // Extended to match social interactions
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

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
