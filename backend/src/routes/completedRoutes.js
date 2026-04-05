import { Router } from 'express';
import {
  addCompletedCourse,
  getMyCompletedCourses,
  deleteCompletedCourse,
  likeCompletion,
  unlikeCompletion,
  getRecentActivity,
  getUserCompletions,
} from '../controllers/completedCourseController.js';
import { addComment, getCompletionComments } from '../controllers/commentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

// All completed-course routes are protected
router.use(protect);

// Logs
router.post('/', addCompletedCourse);
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
