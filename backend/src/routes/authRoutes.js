import { Router } from 'express';
import { registerUser, loginUser, getMe, getUserProfile } from '../controllers/authController.js';
import { followUser, unfollowUser } from '../controllers/userSocialController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

// Auth
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', authenticate, getMe);
router.get('/profile/:id', authenticate, getUserProfile);

// Social (Follow/Unfollow)
router.post('/follow/:id', authenticate, followUser);
router.post('/unfollow/:id', authenticate, unfollowUser);

export default router;
