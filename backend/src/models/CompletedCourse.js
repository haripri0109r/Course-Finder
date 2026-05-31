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
    likesCount: {
      type: Number,
      default: 0,
      index: true,
    },
    commentCount: {
      type: Number,
      default: 0,
      index: true,
    },
    bookmarkCount: {
      type: Number,
      default: 0,
      index: true,
    },
    shareCount: {
      type: Number,
      default: 0,
    },
    engagementScore: {
      type: Number,
      default: 0,
      index: true,
    },
    viewsCount: {
      type: Number,
      default: 0,
    },
    viewedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    description: {
      type: String,
      maxlength: [300, 'Description cannot exceed 300 characters'],
      default: '',
      trim: true,
    },
    learnings: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    // Denormalized Course Metadata for High-Performance Retrieval
    courseTags: {
      type: [String],
      default: [],
      index: true, // Crucial for interest retrieval
    },
    coursePlatform: {
      type: String,
      index: true,
    },
    courseRating: {
      type: Number,
      default: 0,
    },
    courseCompletions: {
      type: Number,
      default: 0,
    },
    courseTitle: String,
    courseImage: String,
    isRemoved: {
      type: Boolean,
      default: false,
      index: true,
    },
    removedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    removedAt: {
      type: Date,
      default: null,
    },
    removalReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Unique constraint: one user can log the same course only once ─────────
completedCourseSchema.index({ user: 1, course: 1 }, { unique: true });

// ─── Performance Indexes ──────────────────────────────────────────────────────
completedCourseSchema.index({ createdAt: -1 });              
completedCourseSchema.index({ viewsCount: -1 });             
completedCourseSchema.index({ user: 1, createdAt: -1 });     
completedCourseSchema.index({ course: 1 });                  
completedCourseSchema.index({ isPublic: 1, finalFeedScore: -1, createdAt: -1, _id: -1 }); 
completedCourseSchema.index({ isPublic: 1, courseTags: 1, createdAt: -1 }); // Optimized for interest retrieval
completedCourseSchema.index({ isPublic: 1, courseRating: -1, viewsCount: -1 }); // Optimized for deterministic discovery

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
