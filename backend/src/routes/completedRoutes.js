import { Router } from 'express';
import {
  addCompletedCourse,
  getMyCompletedCourses,
  deleteCompletedCourse,
  likeCompletion,
  unlikeCompletion,
  getRecentActivity,
  getUserCompletions,
  getCompletedCourseById,
  uploadCertificate,
  trackCertView,
  incrementViewCount,
  getTrendingCompletions,
  getPostById
} from '../controllers/completedCourseController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { sanitizeImage } from '../middleware/sanitizeImage.js';
import { cacheHeaders } from '../middleware/cacheHeaders.js';
import upload from '../middleware/uploadMiddleware.js';
import { uploadLimiter } from '../middleware/rateLimiters.js';

const router = Router();

// All completed-course routes are protected via single router-level middleware
router.use(authenticate);

// ─── Course Completions ──────────────────────────────────────────────────────
router.post('/completed',
  uploadLimiter,
  upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'certificate', maxCount: 1 }
  ]),
  sanitizeImage,
  addCompletedCourse
);

router.post('/completed/upload-certificate', uploadLimiter, upload.single('file'), uploadCertificate);
router.post('/completed/analytics/cert-view', trackCertView);
router.get('/completed/me', cacheHeaders, getMyCompletedCourses);
router.get('/completed/trending', getTrendingCompletions);
router.get('/completed/user/:userId', getUserCompletions);
router.get('/completed/:id', getCompletedCourseById);
router.delete('/completed/:id', deleteCompletedCourse);

// ─── Feed ────────────────────────────────────────────────────────────────────
router.get('/posts/feed', getRecentActivity);
router.get('/posts/:id', getPostById);
router.get('/recent', getRecentActivity);

// ─── Social (Like/Unlike/View) ───────────────────────────────────────────────
router.post('/completed/:id/like', likeCompletion);
router.post('/completed/:id/unlike', unlikeCompletion);
router.post('/completed/:id/view', incrementViewCount);

export default router;
