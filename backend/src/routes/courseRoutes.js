import { Router } from 'express';
import {
  searchCourses,
  getRecommendedCourses,
  getTrendingCourses,
  getCourseById,
  getCourseReviews,
} from '../controllers/courseController.js';

const router = Router();

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

export default router;
