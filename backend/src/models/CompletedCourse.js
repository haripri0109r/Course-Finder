import mongoose from 'mongoose';

const completedCourseSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required'],
    },
    rating: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    review: {
      type: String,
      trim: true,
      maxlength: [1000, 'Review cannot exceed 1000 characters'],
      default: '',
    },
    duration: {
      type: String,
      default: 'N/A',
    },
    certificateUrl: {
      type: String,
      default: '',
      trim: true,
    },
    certificatePublicId: {
      type: String,
      default: null,
      trim: true,
    },
    progress: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// ─── Unique constraint: one user can log the same course only once ─────────
completedCourseSchema.index({ user: 1, course: 1 }, { unique: true });

// ─── Performance Indexes ──────────────────────────────────────────────────────
completedCourseSchema.index({ createdAt: -1 });              // Global Feed Sorting
completedCourseSchema.index({ user: 1, createdAt: -1 });     // User Profile Feed Sorting (Compound)

// ─── After saving, update the Course's averageRating + totalRatings ───────────
completedCourseSchema.post('save', async function () {
  const CompletedCourse = this.constructor;

  const stats = await CompletedCourse.aggregate([
    { $match: { course: this.course, rating: { $exists: true, $ne: null } } },
    {
      $group: {
        _id: '$course',
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 },
        completions: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    const { avgRating, count, completions } = stats[0];
    await mongoose.model('Course').findByIdAndUpdate(this.course, {
      averageRating: Math.round(avgRating * 10) / 10,
      totalRatings: count,
      totalCompletions: completions,
    });
  }
});

// ─── Clean output ─────────────────────────────────────────────────────────────
completedCourseSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const CompletedCourse = mongoose.model('CompletedCourse', completedCourseSchema);

export default CompletedCourse;
