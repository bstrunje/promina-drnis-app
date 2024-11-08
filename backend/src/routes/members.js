// backend/src/routes/members.js
import express from 'express';
import memberController from '../controllers/member.controller.js';
import { authenticateToken, roles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', authenticateToken, memberController.getAllMembers);
router.get('/:memberId', authenticateToken, memberController.getMemberById);
router.get('/:memberId/stats', authenticateToken, memberController.getMemberStats);

// Protected routes
router.post('/', authenticateToken, roles.requireAdmin, memberController.createMember);
router.put('/:memberId', authenticateToken, roles.requireAdmin, memberController.updateMember);
router.delete('/:memberId', authenticateToken, roles.requireSuperuser, memberController.deleteMember);

export default router;