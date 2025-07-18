// backend/src/routes/members.ts
import express, { Request, Response } from 'express';
import type { RequestHandler } from 'express';
import { memberController, getMemberDashboardStats } from '../controllers/member.controller.js';
import memberProfileController from '../controllers/memberProfile.controller.js';
import cardNumberController from '../controllers/cardnumber.controller.js';
import memberStatsController from '../controllers/memberStats.controller.js';
import memberMessageController from '../controllers/member.message.controller.js';
import { authMiddleware as authenticateToken, roles } from '../middleware/authMiddleware.js';
import prisma from '../utils/prisma.js';
import multerConfig from '../config/upload.js';
import { MembershipEndReason } from '../shared/types/membership.js';
import memberService from '../services/member.service.js';
import stampService from '../services/stamp.service.js';

const router = express.Router();

// Public routes
// Dashboard statistike za običnog člana - stavljeno prije dinamičkih ruta da se ne poklopi s /:memberId
router.get('/dashboard/stats', authenticateToken, getMemberDashboardStats);

// Rute za poruke koje moraju biti prije dinamičke /:memberId rute
router.get('/unread-count', authenticateToken, memberMessageController.getUnreadMessageCount);
router.get('/sent', authenticateToken, memberMessageController.getSentMessages);

router.get('/', authenticateToken, memberController.getAllMembers);
router.get('/:memberId', authenticateToken, memberController.getMemberById);
router.get('/:memberId/stats', authenticateToken, memberStatsController.getMemberStats);
router.get('/:memberId/annual-stats', authenticateToken, memberStatsController.getMemberAnnualStats);
router.get('/:memberId/activities', authenticateToken, memberStatsController.getMemberWithActivities);

// Rute za poruke vezane za određenog člana
router.post('/:memberId/messages', authenticateToken, memberMessageController.createMessage);
router.get('/:memberId/messages', authenticateToken, memberMessageController.getMemberMessages);
router.put('/:memberId/messages/:messageId/read', authenticateToken, memberMessageController.markMemberMessageAsRead);

// Protected routes
router.post('/', authenticateToken, roles.requireAdmin, memberProfileController.createMember);
router.put('/:memberId', authenticateToken, roles.requireAdmin, memberProfileController.updateMember);
// router.delete('/:memberId', authenticateToken, roles.requireSuperUser, memberController.deleteMember);
router.put('/:memberId/role', authenticateToken, roles.requireSuperUser, memberProfileController.updateMemberRole);

// Dodjela broja iskaznice i generiranje lozinke - preusmjereno na ispravan kontroler
router.post('/:memberId/card-number', authenticateToken, roles.requireAdmin, cardNumberController.assignCardNumber);



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
  memberProfileController.uploadProfileImage
);

router.delete(
  '/:memberId/profile-image',
  authenticateToken,
  memberProfileController.deleteProfileImage
);

router.get('/test', (req, res) => {
    console.log('Test route hit');
    res.json({ message: 'Member routes are working' });
  });
  
export default router;