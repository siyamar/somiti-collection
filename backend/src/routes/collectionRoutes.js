import { Router } from 'express';
import { correctCollection } from '../controllers/dayController.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Correction on a specific collection row (Admin only)
router.post('/:id/correct', authMiddleware, requireAdmin, correctCollection);

export default router;
