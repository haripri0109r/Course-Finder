import { Router } from 'express';
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
import { metadataLimiter } from '../middleware/rateLimiters.js';

const router = Router();

// GET /api/v1/courses/search        → search and filter courses (public)
router.get('/search', searchCourses);

// GET /api/v1/courses/recommended   → smart recommendations (public)
router.get('/recommended', getRecommendedCourses);

// GET /api/v1/courses/trending      → trending / top recent completions (public)
router.get('/trending', getTrendingCourses);

// GET /api/v1/courses/:id           → single course detail (public)
router.get('/:id', getCourseById);

// GET /api/v1/courses/:id/reviews   → public reviews for a course
router.get('/:id/reviews', getCourseReviews);

// POST /api/v1/courses/:id/view     → increment course view count (public/auth)
router.post('/:id/view', incrementViewCount);

// POST /api/v1/courses/fetch-metadata → fetch metadata for a course URL (authenticated)
router.post('/fetch-metadata', authenticate, metadataLimiter, fetchMetadata);

export default router;
