import { Router } from 'express';
import {
  getUsers,
  createUser,
  updateUser,
  resetPassword,
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
} from '../controllers/userController.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// All user management routes require admin role
router.use(authMiddleware, requireAdmin);

router.get('/', getUsers);
router.post('/', validate(createUserSchema), createUser);
router.put('/:id', validate(updateUserSchema), updateUser);
router.post('/:id/reset-password', validate(resetPasswordSchema), resetPassword);

export default router;
