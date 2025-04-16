// backend/src/routes/members.ts
import express, { Request, Response } from 'express';
import type { RequestHandler } from 'express';
import memberController from '../controllers/member.controller.js';
import { authMiddleware as authenticateToken, roles } from '../middleware/authMiddleware.js';
import prisma from '../utils/prisma.js';
import multerConfig from '../config/upload.js';
import { MembershipEndReason } from '../shared/types/membership.js';
import memberService from '../services/member.service.js';
import stampService from '../services/stamp.service.js';

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
router.post(
  '/:memberId/membership/terminate', 
  authenticateToken, 
  roles.requireAdmin, 
  memberController.terminateMembership
);
router.put(
  '/:memberId/membership-history', 
  authenticateToken, 
  roles.requireAdmin, 
  memberController.updateMembershipHistory
);

router.put(
  '/:memberId/membership-periods/:periodId/end-reason',
  authenticateToken,
  roles.requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { memberId, periodId } = req.params;
      const { endReason } = req.body;

      // Add validation
      if (!memberId || !periodId || !endReason) {
        return res.status(400).json({ 
          error: 'Missing required parameters' 
        });
      }

      const updatedPeriod = await prisma.membershipPeriod.update({
        where: {
          period_id: parseInt(periodId)
        },
        data: {
          end_reason: endReason
        }
      });

      res.json(updatedPeriod);
    } catch (error) {
      console.error('Error updating end reason:', error);
      res.status(500).json({ error: 'Failed to update end reason' });
    }
  }
);

// For issuing stamps - admin can do this
router.post("/:memberId/stamp", authenticateToken, roles.requireAdmin, async (req, res) => {
  try {
    const memberId = parseInt(req.params.memberId);
    
    // Get member details to determine stamp type
    const member = await memberService.getMemberById(memberId);
    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }
    
    // Map life status to stamp type
    const stampType = 
      member.life_status === "employed/unemployed" ? "employed" :
      member.life_status === "child/pupil/student" ? "student" :
      member.life_status === "pensioner" ? "pensioner" : "employed";
    
    // Issue stamp - this already updates both the inventory and the member's stamp status
    await stampService.issueStamp(memberId, stampType || null);
    
    // Fetch the updated member to return in the response
    const updatedMember = await memberService.getMemberById(memberId);
    
    res.json({ 
      message: "Stamp issued successfully",
      member: updatedMember
    });
  } catch (error) {
    console.error("Error issuing stamp:", error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : "Failed to issue stamp" 
    });
  }
});

// For returning stamps to inventory - only superuser can do this
router.post("/:memberId/stamp/return", authenticateToken, roles.requireSuperUser, async (req, res) => {
  try {
    const memberId = parseInt(req.params.memberId);
    
    // Get member details to determine stamp type
    const member = await memberService.getMemberById(memberId);
    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }
    
    // Map life status to stamp type
    const stampType = 
      member.life_status === "employed/unemployed" ? "employed" :
      member.life_status === "child/pupil/student" ? "student" :
      member.life_status === "pensioner" ? "pensioner" : "employed";
    
    // Return stamp to inventory
    await stampService.returnStamp(stampType);
    
    // Update member's stamp status in both tables
    await memberService.updateMember(memberId, { card_stamp_issued: false });
    
    // Update directly in membership_details table to ensure it's updated
    await prisma.membershipDetails.update({
      where: { member_id: memberId },
      data: { card_stamp_issued: false }
    }).catch(err => {
      console.log("Could not update membership_details directly:", err);
      // Try inserting if update fails (in case no record exists)
      return prisma.membershipDetails.upsert({
        where: { member_id: memberId },
        update: { card_stamp_issued: false },
        create: { member_id: memberId, card_stamp_issued: false }
      });
    });
    
    // Get updated member to return in response
    const updatedMember = await memberService.getMemberById(memberId);
    
    console.log("Stamp return completed, updated member:", {
      memberId,
      card_stamp_issued: false,
      membership_details: updatedMember?.membership_details
    });
    
    res.json({ 
      message: "Stamp returned to inventory successfully", 
      member: updatedMember 
    });
  } catch (error) {
    console.error("Error returning stamp:", error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : "Failed to return stamp to inventory" 
    });
  }
});

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