import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  searchCourses,
  getRecommendedCourses,
  getTrendingCourses,
  getCourseById,
  getCourseReviews,
  fetchMetadata,
  incrementViewCount,
} from '../controllers/courseController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

/**
 * Specialized Rate Limiter for Metadata Fetching
 * Prevents bot abuse and protects API quota.
 */
const metadataLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per minute
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again shortly.',
    });
  },
});

// GET /api/courses/search        → search and filter courses (public)
router.get('/search', searchCourses);

// GET /api/courses/recommended   → smart recommendations (public)
router.get('/recommended', getRecommendedCourses);

// GET /api/courses/trending      → trending / top recent completions (public)
router.get('/trending', getTrendingCourses);

// GET /api/courses/:id           → single course detail (public)
router.get('/:id', getCourseById);

// GET /api/courses/:id/reviews   → public reviews for a course
router.get('/:id/reviews', getCourseReviews);

// POST /api/courses/:id/view     → increment course view count (public/auth)
router.post('/:id/view', incrementViewCount);

// POST /api/v1/courses/fetch-metadata → fetch metadata for a course URL (authenticated)
router.post('/fetch-metadata', authenticate, metadataLimiter, fetchMetadata);

export default router;
