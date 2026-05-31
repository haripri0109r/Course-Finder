import { Router } from 'express';
import { getReports, updateReportStatus, toggleContentStatus } from '../controllers/moderationController.js';
import { authenticate, requireModerator } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate, requireModerator);

router.get('/reports', getReports);
router.put('/reports/:id/status', updateReportStatus);
router.put('/content/:type/:id/status', toggleContentStatus);

export default router;
