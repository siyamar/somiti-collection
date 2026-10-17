import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as dashboardCtrl from '../controllers/dashboardController.js';

const router = Router();

router.use(authMiddleware);
router.get('/', dashboardCtrl.getDashboard);

export default router;
