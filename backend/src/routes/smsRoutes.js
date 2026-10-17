import { Router } from 'express';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';
import * as smsCtrl from '../controllers/smsController.js';

const router = Router();

// SMS management endpoints require authentication
router.use(authMiddleware);

router.get('/', smsCtrl.getSmsLogs);
router.post('/reminders', smsCtrl.sendReminders);
router.post('/:id/retry', requireAdmin, smsCtrl.retrySms);

export default router;
