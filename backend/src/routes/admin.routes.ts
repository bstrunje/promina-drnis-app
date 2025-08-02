import express, { Response } from 'express';
import permissionsController from '../controllers/permissions.controller.js';
import { authMiddleware as authenticateToken, checkRole, roles } from '../middleware/authMiddleware.js';
import type { Request } from 'express';
import { DatabaseUser } from '../middleware/authMiddleware.js';
import { getCurrentDate } from '../utils/dateUtils.js';
// Import types
import { Member as MemberType, MembershipDetails, MembershipPeriod } from '../shared/types/index.js';
// Import actual models for database operations
import prisma from '../utils/prisma.js';
import fs from 'fs/promises';
import path from 'path';


interface AuthRequest extends Request {
    user?: DatabaseUser;
}

const router = express.Router();

router.get(
    '/permissions/:memberId',
    authenticateToken,
    (req: AuthRequest, res: Response) => permissionsController.getAdminPermissions(req, res)
);

router.put(
    '/permissions/:memberId',
    authenticateToken,
    checkRole(['member_superuser']),
    permissionsController.updateAdminPermissions
);

// Require admin or superuser role for all routes
router.use(authenticateToken);
router.use((req: AuthRequest, res, next) => {
  // Provjera uloga s korištenjem member_ prefiksa
  if (req.user && (
    req.user.role === 'member_administrator' || 
    req.user.role === 'member_superuser'
  )) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
});

// OPTIMIZIRANI admin dashboard stats endpoint za serverless
router.get('/dashboard/stats', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // PARALELNI upiti umjesto sekvencijalnih - dramatično poboljšanje performansi
    const [totalMembers, registeredMembers, activeMembers, pendingRegistrations, recentActivities] = await Promise.allSettled([
      prisma.member.count(),
      prisma.member.count({ where: { status: 'registered' } }),
      prisma.member.count({ where: { status: 'registered', total_hours: { gte: 20 } } }),
      prisma.member.count({ where: { registration_completed: false } }),
      prisma.activity.count({ where: { created_at: { gte: thirtyDaysAgo } } })
    ]);
    
    // Sistemske informacije - bez čitanja datotečnog sustava (sporo na serverless)
    const systemHealth = "Optimal";
    const lastBackup = "Managed by Vercel"; // Serverless ne koristi lokalne backup datoteke
    
    // Cache headers za smanjenje opterećenja
    res.set('Cache-Control', 'public, max-age=60'); // 1 minuta cache
    
    res.json({
      totalMembers: totalMembers.status === 'fulfilled' ? totalMembers.value : 0,
      registeredMembers: registeredMembers.status === 'fulfilled' ? registeredMembers.value : 0,
      activeMembers: activeMembers.status === 'fulfilled' ? activeMembers.value : 0,
      pendingRegistrations: pendingRegistrations.status === 'fulfilled' ? pendingRegistrations.value : 0,
      recentActivities: recentActivities.status === 'fulfilled' ? recentActivities.value : 0,
      systemHealth,
      lastBackup
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Error fetching dashboard statistics' });
  }
});

// Endpoint za provjeru i ažuriranje statusa članova prema njihovim periodima članstva
router.post('/check-member-statuses', authenticateToken, checkRole(['member_superuser']), async (req: AuthRequest, res: Response) => {
  try {
    console.log('Starting member status check and update...');
    const db = await import('../utils/db.js').then(m => m.default);
    
    // Dohvati sve članove
    const membersResult = await db.query(
      'SELECT member_id, status FROM members WHERE role != $1 ORDER BY member_id',
      ['system']
    );
    
    const members = membersResult.rows;
    console.log(`Found ${members.length} members to check`);
    
    let updatedCount = 0;
    let noChangeCount = 0;
    const updatedMembers = [];
    
    // Za svakog člana provjeri ima li aktivnih perioda članstva
    for (const member of members) {
      // Dohvati aktivne periode članstva (bez end_date)
      const activePeriods = await db.query(
        'SELECT COUNT(*) as active_count FROM membership_periods WHERE member_id = $1 AND end_date IS NULL',
        [member.member_id]
      );
      
      const allPeriods = await db.query(
        'SELECT COUNT(*) as total_count FROM membership_periods WHERE member_id = $1',
        [member.member_id]
      );
      const totalPeriodsCount = parseInt(allPeriods.rows[0].total_count);

      const activeCount = parseInt(activePeriods.rows[0].active_count);

      // Odredi koji status član treba imati
      let shouldBeStatus = 'inactive'; // Default je neaktivan ako ima povijest

      if (totalPeriodsCount === 0) {
        // Ako nema nikakvih perioda, član je na čekanju
        shouldBeStatus = 'pending';
      } else if (activeCount > 0) {
        // Ako ima barem jedan aktivan period, član je registriran
        shouldBeStatus = 'registered';
      } 
      // Ako ima periode, ali nijedan nije aktivan, ostaje 'inactive'
      
      // Ažuriraj status ako nije ispravan
      if (member.status !== shouldBeStatus) {
        console.log(`Updating member ${member.member_id} status from ${member.status} to ${shouldBeStatus}`);
        await db.query(
          'UPDATE members SET status = $1 WHERE member_id = $2',
          [shouldBeStatus, member.member_id]
        );
        updatedCount++;
        updatedMembers.push({
          member_id: member.member_id,
          old_status: member.status,
          new_status: shouldBeStatus
        });
      } else {
        noChangeCount++;
      }
    }
    
    return res.json({
      message: `Status check complete. Updated ${updatedCount} members, ${noChangeCount} already had correct status.`,
      updated_members: updatedMembers
    });
  } catch (error) {
    console.error('Error checking member statuses:', error);
    return res.status(500).json({ error: 'Failed to check member statuses' });
  }
});



export default router;
