import { Router } from 'express';
import {
  login,
  logout,
  me,
  changePassword,
  loginLimiter,
  loginSchema,
  changePasswordSchema,
} from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.post('/login', loginLimiter, validate(loginSchema), login);
router.post('/logout', logout);
router.get('/me', authMiddleware, me);
router.post('/change-password', authMiddleware, validate(changePasswordSchema), changePassword);

export default router;
