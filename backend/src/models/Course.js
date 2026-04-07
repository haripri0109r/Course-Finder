import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    platform: {
      type: String,
      required: [true, 'Platform is required'],
      enum: {
        values: ['Udemy', 'Coursera', 'YouTube', 'Other'],
        message: 'Platform must be Udemy, Coursera, YouTube, or Other',
      },
    },
    url: {
      type: String,
      required: [true, 'Course URL is required'],
      unique: true,
      trim: true,
    },
    duration: {
      type: String,
      default: 'N/A',
    },
    image: {
      type: String,
      trim: true,
      default: '',
    },
    tags: {
      type: [String],
      default: [],
      set: (tags) => tags.map((t) => t.toLowerCase().trim()), // normalize on write
    },
    level: {
      type: String,
      enum: {
        values: ['beginner', 'intermediate', 'advanced'],
        message: 'Level must be beginner, intermediate, or advanced',
      },
      default: 'beginner',
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalRatings: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalCompletions: {
      type: Number,
      default: 0,
      min: 0,
    },
    viewsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
courseSchema.index({ title: 'text', tags: 'text' }); // full-text search
courseSchema.index({ platform: 1 });                  // filter by platform
courseSchema.index({ averageRating: -1 });            // sort by top-rated
courseSchema.index({ totalCompletions: -1 });         // sort by popularity

// ─── Clean output ─────────────────────────────────────────────────────────────
courseSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Course = mongoose.model('Course', courseSchema);

export default Course;
