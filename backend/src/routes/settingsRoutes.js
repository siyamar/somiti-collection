import { Router } from 'express';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';
import { upload, processLogo } from '../middleware/upload.js';
import * as settingsCtrl from '../controllers/settingsController.js';

const router = Router();

// All settings routes require admin authorization
router.use(authMiddleware);
router.use(requireAdmin);

router.get('/', settingsCtrl.getSettings);
router.put('/', settingsCtrl.updateSettings);
router.post('/logo', upload.single('logo'), processLogo, settingsCtrl.uploadLogo);
router.post('/sms-test', settingsCtrl.sendTestSms);

export default router;
