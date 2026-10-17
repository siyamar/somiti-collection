import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as reportCtrl from '../controllers/reportController.js';

const router = Router();

router.use(authMiddleware);

router.get('/daily', reportCtrl.getDailyReport);
router.get('/monthly', reportCtrl.getMonthlyReport);
router.get('/dues', reportCtrl.getDuesReport);
router.get('/statement/:memberId', reportCtrl.getMemberStatement);

export default router;
