import { Router } from 'express';
import { trackActivity } from '../controllers/activityController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

// ─── Protected Activity Tracking ─────────────────────────────────────────────
router.post('/track', authenticate, trackActivity);

export default router;
