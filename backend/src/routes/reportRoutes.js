import { Router } from 'express';
import { createReport } from '../controllers/reportController.js';
import { authenticate, enforceNotSuspended } from '../middleware/authMiddleware.js';
import { generalLimiter } from '../middleware/rateLimiters.js';

const router = Router();

router.post('/', generalLimiter, authenticate, enforceNotSuspended, createReport);

export default router;
