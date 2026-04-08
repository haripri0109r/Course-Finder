import { Router } from 'express';
import { 
  addComment, 
  getComments, 
  toggleLikeComment 
} from '../controllers/commentController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

// Set up standardized social routes
router.use(authenticate);

router.post('/', addComment);
router.get('/:postId', getComments);
router.post('/:id/like', toggleLikeComment);

export default router;
