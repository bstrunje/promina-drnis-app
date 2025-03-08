import express from 'express';
import db from '../utils/db.js';
import { authMiddleware as authenticateToken, roles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Debug endpoint to check raw database data
router.get('/member/:memberId/raw', authenticateToken, roles.requireSuperUser, async (req, res) => {
  try {
    const memberId = parseInt(req.params.memberId);
    
    // Fetch raw data directly from the database
    const memberResult = await db.query(
      `SELECT * FROM members WHERE member_id = $1`,
      [memberId]
    );
    
    const membershipDetailsResult = await db.query(
      `SELECT * FROM membership_details WHERE member_id = $1`,
      [memberId]
    );
    
    const periodsResult = await db.query(
      `SELECT * FROM membership_periods WHERE member_id = $1 ORDER BY start_date DESC`,
      [memberId]
    );
    
    // Log the raw results
    console.log('Raw member data:', JSON.stringify(memberResult.rows[0], null, 2));
    console.log('Raw membership_details:', JSON.stringify(membershipDetailsResult.rows[0], null, 2));
    console.log('Raw membership_periods:', JSON.stringify(periodsResult.rows, null, 2));
    
    // Return the combined data
    res.json({
      member: memberResult.rows[0],
      membership_details: membershipDetailsResult.rows[0],
      membership_periods: periodsResult.rows
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ message: 'Error fetching raw data' });
  }
});

export default router;
