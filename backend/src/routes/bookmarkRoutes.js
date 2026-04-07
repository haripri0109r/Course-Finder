import { Router } from 'express';
import { 
  bookmarkCompletion, 
  removeBookmark, 
  getBookmarks 
} from '../controllers/bookmarkController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// GET /api/bookmarks
router.get('/', getBookmarks);

// POST /api/bookmarks/:id
router.post('/:id', bookmarkCompletion);

// DELETE /api/bookmarks/:id
router.delete('/:id', removeBookmark);

export default router;
