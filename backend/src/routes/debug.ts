import express from 'express';
import prisma from '../utils/prisma.js';
import { authMiddleware as authenticateToken, roles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Debug endpoint to check raw database data
router.get('/member/:memberId/raw', authenticateToken, roles.requireSuperUser, async (req, res) => {
  try {
    const memberId = parseInt(req.params.memberId);
    
    // Fetch raw data directly from the database using Prisma
    const memberResult = await prisma.member.findUnique({
      where: {
        member_id: memberId
      }
    });
    
    const membershipDetailsResult = await prisma.membershipDetails.findUnique({
      where: {
        member_id: memberId
      }
    });
    
    const periodsResult = await prisma.membershipPeriod.findMany({
      where: {
        member_id: memberId
      },
      orderBy: {
        start_date: 'desc'
      }
    });
    
    // Log the raw results
    console.log('Raw member data:', JSON.stringify(memberResult, null, 2));
    console.log('Raw membership_details:', JSON.stringify(membershipDetailsResult, null, 2));
    console.log('Raw membership_periods:', JSON.stringify(periodsResult, null, 2));
    
    // Return the combined data
    res.json({
      member: memberResult,
      membership_details: membershipDetailsResult,
      membership_periods: periodsResult
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ message: 'Error fetching raw data' });
  }
});

export default router;
