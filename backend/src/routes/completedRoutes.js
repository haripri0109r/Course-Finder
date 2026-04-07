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
import { authenticate } from '../middleware/authMiddleware.js';
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
router.post('/', authenticate, upload.single('file'), sanitizeImage, addCompletedCourse);
router.post('/upload-certificate', authenticate, upload.single('file'), uploadCertificate);
router.post('/analytics/cert-view', authenticate, trackCertView);
router.get('/me', authenticate, cacheHeaders, getMyCompletedCourses);
router.get('/recent', authenticate, getRecentActivity);
router.get('/user/:userId', authenticate, getUserCompletions);
router.get('/:id', authenticate, getCompletedCourseById);
router.delete('/:id', authenticate, deleteCompletedCourse);

// Social (Like/Unlike)
router.post('/:id/like', authenticate, likeCompletion);
router.post('/:id/unlike', authenticate, unlikeCompletion);

// Comments
router.post('/:id/comments', authenticate, addComment);
router.get('/:id/comments', getCompletionComments);

export default router;
