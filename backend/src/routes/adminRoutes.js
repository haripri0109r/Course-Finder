import { Router } from 'express';
import { getUsers, updateUserStatus, updateUserRole, getAdminAnalytics } from '../controllers/adminController.js';
import { authenticate, requireAdmin, requireSuperAdmin } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/users', getUsers);
router.put('/users/:id/status', updateUserStatus);
router.get('/analytics', getAdminAnalytics);

// Super Admin Only
router.put('/users/:id/role', requireSuperAdmin, updateUserRole);

export default router;
