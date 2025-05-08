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
// Dashboard statistike za običnog člana - stavljeno prije dinamičkih ruta da se ne poklopi s /:memberId
router.get('/dashboard/stats', authenticateToken, memberController.getMemberDashboardStats);

router.get('/', authenticateToken, memberController.getAllMembers);
router.get('/:memberId', authenticateToken, memberController.getMemberById);
router.get('/:memberId/stats', authenticateToken, memberController.getMemberStats);
router.get('/:memberId/activities', authenticateToken, memberController.getMemberWithActivities);

// Protected routes
router.post('/', authenticateToken, roles.requireAdmin, memberController.createMember);
router.put('/:memberId', authenticateToken, roles.requireAdmin, memberController.updateMember);
router.delete('/:memberId', authenticateToken, roles.requireSuperUser, memberController.deleteMember);
router.put('/:memberId/role', authenticateToken, roles.requireSuperUser, memberController.updateMemberRole);
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

// Issue stamp - add parameter for next year
router.post("/:memberId/stamp", authenticateToken, roles.requireAdmin, async (req, res) => {
  try {
    const memberId = parseInt(req.params.memberId);
    const { forNextYear = false } = req.body; // Get parameter from request body
    
    // Get member to determine stamp type
    const member = await memberService.getMemberById(memberId);
    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }
    
    // Determine stamp type based on life status
    const stampType = 
      member.life_status === "employed/unemployed" ? "employed" :
      member.life_status === "child/pupil/student" ? "student" :
      member.life_status === "pensioner" ? "pensioner" : "employed";
    
    // Issue stamp with the new parameter
    await stampService.issueStamp(memberId, stampType, forNextYear);
    
    // Update member record for current year stamps only (prisma limitation)
    if (!forNextYear) {
      // Ažuriraj samo u membership_details tablici jer card_stamp_issued više nije polje na Memberu
      await prisma.membershipDetails.upsert({
        where: { member_id: memberId },
        update: { card_stamp_issued: true },
        create: { 
          member_id: memberId, 
          card_stamp_issued: true
        }
      });
    } else {
      // Za markice za sljedeću godinu, spremi u membership_details tablicu
      await prisma.membershipDetails.upsert({
        where: { member_id: memberId },
        update: { next_year_stamp_issued: true },
        create: { 
          member_id: memberId, 
          next_year_stamp_issued: true
        }
      });
      console.log(`Issuing next year stamp for member ${memberId} - Stored in database`);
    }
    
    // Get updated member to return
    const updatedMember = await memberService.getMemberById(memberId);
    
    // next_year_stamp_issued se više ne postavlja ručno na Member objekt - koristi se membership_details
    // (Ovdje nije potreban manualni patch jer frontend koristi membership_details.next_year_stamp_issued)
    
    
    res.json({ 
      message: forNextYear ? "Stamp for next year issued successfully" : "Stamp issued successfully",
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
    const { forNextYear = false } = req.body; // Get parameter from request body
    
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
    
    // Return stamp to inventory with the new parameter
    await stampService.returnStamp(stampType, memberId, forNextYear);
    
    // Update only for current year stamps (prisma limitation)
    if (!forNextYear) {
      // Ažuriraj samo u membership_details tablici jer card_stamp_issued više nije polje na Memberu
      await prisma.membershipDetails.update({
        where: { member_id: memberId },
        data: { card_stamp_issued: false }
      });
    } else {
      // Za markice za sljedeću godinu, ažuriraj membership_details tablicu
      await prisma.membershipDetails.update({
        where: { member_id: memberId },
        data: { next_year_stamp_issued: false }
      });
      console.log(`Returning next year stamp for member ${memberId} - Updated in database`);
    }
    
    // Get updated member to return in response
    const updatedMember = await memberService.getMemberById(memberId);
    
    res.json({ 
      message: forNextYear ? "Stamp for next year returned successfully" : "Stamp returned successfully",
      member: updatedMember
    });
  } catch (error) {
    console.error("Error returning stamp:", error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : "Failed to return stamp" 
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