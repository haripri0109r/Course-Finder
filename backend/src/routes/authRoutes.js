import { Router } from 'express';
import {
  registerUser,
  loginUser,
  getMe,
  getUserProfile,
  savePushToken,
  updateProfile,
  forgotPassword,
  resetPassword,
  deleteAccount,
  changePassword,
  refreshTokenHandler,
  logout,
  logoutAll,
} from '../controllers/authController.js';
import { followUser, unfollowUser, getFollowers, getFollowing } from '../controllers/userSocialController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { loginLimiter, registerLimiter, forgotPasswordLimiter, resetPasswordLimiter } from '../middleware/rateLimiters.js';

const router = Router();

// ─── Public Auth (with brute-force protection) ───────────────────────────────
router.post('/register', registerLimiter, registerUser);
router.post('/login', loginLimiter, loginUser);
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/reset-password/:token', resetPasswordLimiter, resetPassword);
router.post('/refresh', refreshTokenHandler);

// ─── Protected Profile ───────────────────────────────────────────────────────
router.post('/logout', authenticate, logout);
router.post('/logout-all', authenticate, logoutAll);
router.get('/me', authenticate, getMe);
router.put('/me', authenticate, updateProfile);
router.delete('/me', authenticate, deleteAccount);
router.post('/change-password', authenticate, changePassword);
router.get('/profile/:id', authenticate, getUserProfile);
router.put('/push-token', authenticate, savePushToken);

// ─── Social (Follow/Unfollow) — single consolidated system ───────────────────
router.post('/follow/:id', authenticate, followUser);
router.post('/unfollow/:id', authenticate, unfollowUser);
router.get('/users/:id/followers', authenticate, getFollowers);
router.get('/users/:id/following', authenticate, getFollowing);

export default router;
