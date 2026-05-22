import { Router } from 'express';
import { 
  addComment, 
  getComments, 
  getReplies,
  toggleLikeComment 
} from '../controllers/commentController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

// Set up standardized social routes
router.use(authenticate);

router.post('/', addComment);
router.get('/:postId', getComments);
router.get('/:commentId/replies', getReplies);
router.post('/:id/like', toggleLikeComment);

export default router;
