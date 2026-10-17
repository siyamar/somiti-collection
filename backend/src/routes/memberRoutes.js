import { Router } from 'express';
import {
  getMembers,
  getAreas,
  createMember,
  getMemberById,
  updateMember,
  updateMemberStatus,
  getMemberTransactions,
} from '../controllers/memberController.js';
import { authMiddleware } from '../middleware/auth.js';
import { upload, processPhoto } from '../middleware/upload.js';

const router = Router();

// All member endpoints require authenticated user (admin or collector)
router.use(authMiddleware);

router.get('/areas', getAreas);
router.get('/', getMembers);
router.post('/', upload.single('photo'), processPhoto, createMember);
router.get('/:id', getMemberById);
router.put('/:id', upload.single('photo'), processPhoto, updateMember);
router.patch('/:id/status', updateMemberStatus);
router.get('/:id/transactions', getMemberTransactions);

export default router;
