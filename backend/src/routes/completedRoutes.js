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
  trackCertView
} from '../controllers/completedCourseController.js';
import { addComment, getCompletionComments } from '../controllers/commentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { sanitizeImage } from '../middleware/sanitizeImage.js';
import { cacheHeaders } from '../middleware/cacheHeaders.js';
import upload from '../middleware/uploadMiddleware.js';
import rateLimit from 'express-rate-limit';

const router = Router();

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, 
  max: 10,
  message: {
    success: false,
    message: 'Too many uploads from this IP, please try again after a minute',
  },
});

// All completed-course routes are protected
router.use(protect);

// Logs
router.post('/', sanitizeImage, addCompletedCourse);
router.post('/upload-certificate', uploadLimiter, upload.single('file'), uploadCertificate);
router.post('/analytics/cert-view', trackCertView);
router.get('/me', cacheHeaders, getMyCompletedCourses);
router.get('/recent', cacheHeaders, getRecentActivity);
router.get('/:id', cacheHeaders, getCompletedCourseById);
router.get('/user/:userId', cacheHeaders, getUserCompletions);
router.delete('/:id', deleteCompletedCourse);

// Social (Like/Unlike)
router.post('/:id/like', likeCompletion);
router.post('/:id/unlike', unlikeCompletion);

// Comments
router.post('/:completedCourseId/comments', addComment);
router.get('/:completedCourseId/comments', getCompletionComments);

export default router;
