// backend/src/routes/members.ts
import express from 'express';
import type { RequestHandler } from 'express';
import memberController from '../controllers/member.controller.js';
import { authMiddleware as authenticateToken, roles } from '../middleware/authMiddleware.js';
import multerConfig from '../config/upload.js';

const router = express.Router();

// Public routes
router.get('/', authenticateToken, memberController.getAllMembers);
router.get('/:memberId', authenticateToken, memberController.getMemberById);
router.get('/:memberId/stats', authenticateToken, memberController.getMemberStats);
router.get('/:memberId/activities', authenticateToken, memberController.getMemberWithActivities);

// Protected routes
router.post('/', authenticateToken, roles.requireAdmin, memberController.createMember);
router.put('/:memberId', authenticateToken, roles.requireAdmin, memberController.updateMember);
router.delete('/:memberId', authenticateToken, roles.requireSuperUser, memberController.deleteMember);
router.put('/:memberId/role', authenticateToken, roles.requireSuperUser, memberController.updateMemberRole);
router.post('/assign-password', authenticateToken, roles.requireAdmin, memberController.assignPassword);
router.post('/:memberId/card', authenticateToken, roles.requireAdmin, memberController.assignCardNumber);
router.post('/:memberId/membership', authenticateToken, roles.requireAdmin, memberController.updateMembership);
router.put(
  '/:memberId/membership-history', 
  authenticateToken, 
  roles.requireSuperUser, 
  memberController.updateMembershipHistory
);

// Profile image routes
router.post(
  '/:memberId/profile-image',
  authenticateToken,
  function(req: express.Request, res: express.Response, next: express.NextFunction) {
    multerConfig.single('image')(req, res, function(err: any) {
      if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  memberController.uploadProfileImage
);

router.delete(
  '/:memberId/profile-image',
  authenticateToken,
  memberController.deleteProfileImage
);

router.get('/test', (req, res) => {
    console.log('Test route hit');
    res.json({ message: 'Member routes are working' });
  });
  
export default router;