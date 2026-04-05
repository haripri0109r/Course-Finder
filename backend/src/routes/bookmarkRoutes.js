import { Router } from 'express';
import { 
  bookmarkCompletion, 
  removeBookmark, 
  getBookmarks 
} from '../controllers/bookmarkController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

// All bookmark routes require authentication
router.use(protect);

// GET /api/bookmarks
router.get('/', getBookmarks);

// POST /api/bookmarks/:id
router.post('/:id', bookmarkCompletion);

// DELETE /api/bookmarks/:id
router.delete('/:id', removeBookmark);

export default router;
