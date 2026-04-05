import { Router } from 'express';
import { registerUser, loginUser, getMe, getUserProfile } from '../controllers/authController.js';
import { followUser, unfollowUser } from '../controllers/userSocialController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

// Auth
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.get('/profile/:id', protect, getUserProfile);

// Social (Follow/Unfollow)
router.post('/follow/:id', protect, followUser);
router.post('/unfollow/:id', protect, unfollowUser);

export default router;
