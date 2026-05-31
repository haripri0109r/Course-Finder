import { Router } from 'express';
import { 
  addComment, 
  getComments, 
  getReplies,
  toggleLikeComment 
} from '../controllers/commentController.js';
import { authenticate, enforceNotSuspended } from '../middleware/authMiddleware.js';

const router = Router();

// Set up standardized social routes
router.use(authenticate);

router.post('/', enforceNotSuspended, addComment);
router.get('/:postId', getComments);
router.get('/:commentId/replies', getReplies);
router.post('/:id/like', enforceNotSuspended, toggleLikeComment);

export default router;
