import mongoose from 'mongoose';
import { Course } from '../models/index.js';
import { API_VERSION, DEFAULT_IMAGE } from '../config/constants.js';

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/courses/search
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const searchCourses = async (req, res) => {
  const {
    q,
    platform,
    minRating,
    level,
    tags,
    limit = 10,
    page = 1,
  } = req.query;

  const filter = {};

  // 1. Text search (requires text index on title/tags)
  if (q) {
    filter.$text = { $search: q };
  }

  // 2. Exact match filters
  if (platform) {
    filter.platform = platform;
  }
  
  if (level) {
    filter.level = level;
  }

  // 3. Range filter for rating
  if (minRating) {
    filter.averageRating = { $gte: Number(minRating) };
  }

  // 4. Array inclusion filter for tags
  if (tags) {
    // split by comma, trim, lowercase
    const tagList = tags.split(',').map((t) => t.toLowerCase().trim());
    filter.tags = { $in: tagList };
  }

  // Pagination setup
  const pageNum = Math.max(Number(page), 1);
  const limitNum = Math.min(Number(limit), 50); // cap at 50 to prevent huge responses
  const skip = (pageNum - 1) * limitNum;

  const [courses, totalResults] = await Promise.all([
    Course.find(filter)
      .sort({ averageRating: -1, totalCompletions: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('title platform url tags level averageRating totalRatings totalCompletions image'),
    Course.countDocuments(filter),
  ]);

  // Ensure every course has a valid image fallback URL in memory
  const processedCourses = courses.map(c => {
    const course = c.toObject();
    return {
      ...course,
      image: course.image || DEFAULT_IMAGE
    };
  });

  return res.status(200).json({
    success: true,
    version: API_VERSION,
    page: pageNum,
    totalPages: Math.ceil(totalResults / limitNum),
    totalResults,
    courses: processedCourses,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/courses/recommended
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const getRecommendedCourses = async (req, res) => {
  // Use MongoDB aggregation to calculate a dynamic score:
  // score = (averageRating * 0.6) + (totalCompletions * 0.3)
  
  const courses = await Course.aggregate([
    {
      $addFields: {
        score: {
          $add: [
            { $multiply: ['$averageRating', 0.6] },
            { $multiply: ['$totalCompletions', 0.3] }
          ]
        }
      }
    },
    { $sort: { score: -1 } },
    { $limit: 20 },
    {
      $project: {
        title: 1,
        platform: 1,
        url: 1,
        tags: 1,
        level: 1,
        averageRating: 1,
        totalRatings: 1,
        totalCompletions: 1,
        image: 1,
        score: 1
      }
    }
  ]);

  const processedCourses = courses.map(c => ({
    ...c,
    image: c.image || DEFAULT_IMAGE
  }));

  return res.status(200).json({
    success: true,
    version: API_VERSION,
    courses: processedCourses,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/courses/trending
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const getTrendingCourses = async (req, res) => {
  // Trending is approximated by maximum completions and recent updates.
  const courses = await Course.find()
    .sort({ totalCompletions: -1, updatedAt: -1 })
    .limit(10)
    .select('title platform url tags level averageRating totalRatings totalCompletions image');

  const processedCourses = courses.map(c => ({
    ...c.toObject(),
    image: c.image || DEFAULT_IMAGE
  }));

  return res.status(200).json({
    success: true,
    version: API_VERSION,
    courses: processedCourses,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/courses/:id
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const getCourseById = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid Course ID format' });
  }

  const course = await Course.findById(req.params.id);

  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found',
    });
  }

  return res.status(200).json({
    success: true,
    data: course,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/courses/:id/reviews
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const getCourseReviews = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid Course ID format' });
  }

  const { CompletedCourse } = await import('../models/index.js');

  const reviews = await CompletedCourse.find({
    course: req.params.id,
    isPublic: true,
    review: { $ne: '' },
  })
    .populate('user', 'name profilePicture')
    .sort({ createdAt: -1 })
    .limit(50);

  return res.status(200).json({
    success: true,
    count: reviews.length,
    data: reviews,
  });
};

export {
  searchCourses,
  getRecommendedCourses,
  getTrendingCourses,
  getCourseById,
  getCourseReviews,
};
