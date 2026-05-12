import { Router } from 'express';
import {
  registerUser,
  loginUser,
  getMe,
  getUserProfile,
  savePushToken,
  updateProfile,
  forgotPassword,
} from '../controllers/authController.js';
import { followUser, unfollowUser } from '../controllers/userSocialController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

// Auth
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.get('/me', authenticate, getMe);
router.put('/me', authenticate, updateProfile);
router.get('/profile/:id', authenticate, getUserProfile);
router.put('/push-token', authenticate, savePushToken);

// Social (Follow/Unfollow)
router.post('/follow/:id', authenticate, followUser);
router.post('/unfollow/:id', authenticate, unfollowUser);

export default router;
