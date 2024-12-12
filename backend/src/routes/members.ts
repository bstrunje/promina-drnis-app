// backend/src/routes/members.ts
import express from 'express';
import memberController from '../controllers/member.controller.js'
import { authMiddleware as authenticateToken, roles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', authenticateToken, memberController.getAllMembers);
router.get('/:memberId', authenticateToken, memberController.getMemberById);
router.get('/:memberId/stats', authenticateToken, memberController.getMemberStats);

// Protected routes
router.post('/', authenticateToken, roles.requireAdmin, memberController.createMember);
router.put('/:memberId', authenticateToken, roles.requireAdmin, memberController.updateMember);
router.delete('/:memberId', authenticateToken, roles.requireSuperUser, memberController.deleteMember);
router.put('/:memberId/role', authenticateToken, roles.requireSuperUser, memberController.updateMemberRole);
router.post('/assign-password', authenticateToken, roles.requireAdmin, memberController.assignPassword);

router.get('/test', (req, res) => {
    console.log('Test route hit');
    res.json({ message: 'Member routes are working' });
  });
  
export default router;