import { Router } from 'express';
import { toggleFollow } from '../controllers/followController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/:id', authenticate, toggleFollow);

export default router;
