import mongoose from 'mongoose';

const bookmarkSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompletedCourse',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicate bookmarks for the same course
bookmarkSchema.index({ userId: 1, courseId: 1 }, { unique: true });

const Bookmark = mongoose.model('Bookmark', bookmarkSchema);
export default Bookmark;
