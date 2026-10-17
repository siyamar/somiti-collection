import { Router } from 'express';
import {
  getDayByDate,
  updateCollections,
  addNewMembers,
  confirmDay,
  retryDaySms,
  correctCollection,
} from '../controllers/dayController.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';

const router = Router();

// All daily collection endpoints require authenticated user
router.use(authMiddleware);

router.get('/:date', getDayByDate);
router.put('/:id/collections', updateCollections);
router.post('/:id/add-new-members', addNewMembers);
router.post('/:id/confirm', confirmDay);
router.post('/:id/retry-sms', requireAdmin, retryDaySms);

export default router;
