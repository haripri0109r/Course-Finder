import { Router } from 'express';
import {
  addCompletedCourse,
  getMyCompletedCourses,
  deleteCompletedCourse,
  likeCompletion,
  unlikeCompletion,
  getRecentActivity,
  getUserCompletions,
  uploadCertificate,
  trackCertView
} from '../controllers/completedCourseController.js';
import { addComment, getCompletionComments } from '../controllers/commentController.js';
import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';
import rateLimit from 'express-rate-limit';

const router = Router();

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: {
    success: false,
    message: 'Too many uploads from this IP, please try again after a minute',
  },
});

// All completed-course routes are protected
router.use(protect);

// Logs
router.post('/', addCompletedCourse);
router.post('/upload-certificate', uploadLimiter, upload.single('file'), uploadCertificate);
router.post('/analytics/cert-view', trackCertView);
router.get('/me', getMyCompletedCourses);
router.get('/recent', getRecentActivity);
router.get('/user/:userId', getUserCompletions);
router.delete('/:id', deleteCompletedCourse);

// Social (Like/Unlike)
router.post('/:id/like', likeCompletion);
router.post('/:id/unlike', unlikeCompletion);

// Comments
router.post('/:completedCourseId/comments', addComment);
router.get('/:completedCourseId/comments', getCompletionComments);

export default router;
