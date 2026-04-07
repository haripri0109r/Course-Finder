import { Router } from 'express';
import { 
  getNotifications, 
  markAsRead, 
  getUnreadCount 
} from '../controllers/notificationController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/:id/read', markAsRead);

export default router;
