import mongoose from 'mongoose';
import { Course, AnalyticsEvent } from '../models/index.js';
import { API_VERSION, DEFAULT_IMAGE } from '../config/constants.js';
import * as metadataService from '../services/metadataService.js';
import { extractYouTubeId } from '../utils/extractYouTubeId.js';
import { trackEvent } from '../services/activityService.js';

// ─── Helpers for Compound Cursor Pagination ───────────────────────────────
const encodeCursor = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64');
const decodeCursor = (str) => {
  try {
    return JSON.parse(Buffer.from(str, 'base64').toString('utf8'));
  } catch (e) {
    return null;
  }
};

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
    cursor,
  } = req.query;

  const filter = {};

  // 1. Text search
  if (q) {
    filter.$text = { $search: q };
  }

  // 2. Filters
  if (platform) filter.platform = platform;
  if (level) filter.level = level;
  if (minRating) filter.averageRating = { $gte: Number(minRating) };
  if (tags) {
    const tagList = tags.split(',').map((t) => t.toLowerCase().trim());
    filter.tags = { $in: tagList };
  }

  // 3. Robust Pagination Logic
  const sort = { averageRating: -1, totalCompletions: -1, _id: -1 };
  const limitNum = Math.min(Number(limit), 50);

  let courses;
  let totalResults = 0;

  if (cursor) {
    // 🛡️ Compound Cursor Pagination (Safety fix)
    const decoded = decodeCursor(cursor);
    if (decoded) {
      const { rating, completions, id } = decoded;
      // MongoDB compound inequality: (rating < r) OR (rating == r AND completions < c) OR (rating == r AND completions == c AND _id < id)
      filter.$or = [
        { averageRating: { $lt: rating } },
        { averageRating: rating, totalCompletions: { $lt: completions } },
        { averageRating: rating, totalCompletions: completions, _id: { $lt: id } }
      ];
    }
    
    courses = await Course.find(filter)
      .sort(sort)
      .limit(limitNum)
      .select('title platform url tags level averageRating totalRatings totalCompletions image')
      .lean();
  } else {
    // Standard Page-based (Backward Compatibility)
    const pageNum = Math.max(Number(page), 1);
    const skip = (pageNum - 1) * limitNum;

    [courses, totalResults] = await Promise.all([
      Course.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .select('title platform url tags level averageRating totalRatings totalCompletions image')
        .lean(),
      Course.countDocuments(filter),
    ]);
  }

  // 4. Generate Next Cursor
  let nextCursor = null;
  if (courses.length === limitNum) {
    const last = courses[courses.length - 1];
    nextCursor = encodeCursor({
      rating: last.averageRating,
      completions: last.totalCompletions,
      id: last._id
    });
  }

  // 5. Instrumentation
  if (q) {
    trackEvent({
      userId: req.user?._id || req.user?.id,
      eventType: 'search_query',
      metadata: { query: q, resultsCount: courses.length }
    });
  }

  const processedCourses = courses.map(c => ({
    ...c,
    image: c.image || DEFAULT_IMAGE
  }));

  const response = {
    success: true,
    version: API_VERSION,
    count: processedCourses.length,
    courses: processedCourses,
    nextCursor
  };

  if (!cursor) {
    const pageNum = Math.max(Number(page), 1);
    response.page = pageNum;
    response.totalResults = totalResults;
    response.totalPages = Math.ceil(totalResults / limitNum);
  }

  return res.status(200).json(response);
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

  // 1. Instrumentation (Click/Open)
  trackEvent({
    userId: req.user?._id || req.user?.id,
    eventType: 'course_open',
    targetId: course._id,
    targetType: 'course',
    metadata: { platform: course.platform }
  });

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
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const cursor = req.query.cursor;

  const query = {
    course: req.params.id,
    isPublic: true,
    review: { $ne: '' },
  };

  if (cursor) {
    query._id = { $lt: cursor };
  }

  const reviews = await CompletedCourse.find(query)
    .populate('user', 'name profilePicture')
    .sort({ _id: -1 })
    .limit(limit)
    .lean();

  const nextCursor = reviews.length === limit ? reviews[reviews.length - 1]._id : null;

  return res.status(200).json({
    success: true,
    count: reviews.length,
    nextCursor,
    data: reviews,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/v1/courses/fetch-metadata
// @access  Private (Authenticated users only)
// ─────────────────────────────────────────────────────────────────────────────
const fetchMetadata = async (req, res) => {
  const { url } = req.body;

  // 7. Debug Backend
  console.log("FETCH METADATA HIT:", url);

  if (!url) {
    return res.status(400).json({ success: false, message: 'URL is required' });
  }

  // 1. Strict URL Validation
  try {
    new URL(url);
  } catch (err) {
    return res.status(400).json({ success: false, message: 'Invalid URL format' });
  }

  try {
    const result = await metadataService.getMetadata(url);
    if (!result.success) {
      return res.status(200).json({
        success: false,
        manualEntry: true,
        reason: result.reason || 'metadata_unavailable',
        version: API_VERSION,
      });
    }
    return res.status(200).json({
      success: true,
      version: API_VERSION,
      metadata: result.metadata || result.data,
      data: result.metadata || result.data,
    });
  } catch (error) {
    console.error('Metadata fetch error in controller:', error.message);
    return res.status(502).json({ 
      success: false, 
      message: 'Failed to fetch course metadata. Please enter details manually.',
      error: error.message 
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/courses/:id/view
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const incrementViewCount = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid Course ID format' });
  }

  try {
    // 1. Atomic increment (Scalable & Concurrency safe)
    const course = await Course.findByIdAndUpdate(
      id,
      { $inc: { viewsCount: 1 } },
      { new: true }
    );

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // 2. Instrumentation using ActivityService (Replacing Legacy Sampling)
    trackEvent({
      userId: req.user?._id || req.user?.id,
      eventType: 'course_open',
      targetId: id,
      targetType: 'course',
      metadata: { platform: course.platform }
    });

    return res.status(200).json({ success: true, viewsCount: course.viewsCount });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export {
  searchCourses,
  getRecommendedCourses,
  getTrendingCourses,
  getCourseById,
  getCourseReviews,
  fetchMetadata,
  incrementViewCount,
};
