import express, { Response } from 'express';
import permissionsController from '../controllers/permissions.controller.js';
import { authMiddleware as authenticateToken, checkRole } from '../middleware/authMiddleware.js';
import type { Request } from 'express';
import type { DatabaseUser } from '../middleware/authMiddleware.js';
import prisma from '../utils/prisma.js';
import { updateAllMembersTotalHours } from '../services/member.service.js';


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
    console.log('[ADMIN-STATS] Početak zahtjeva');
    
    // Dohvati organizaciju iz tenanta
    const tenant = req.query.tenant as string;
    if (!tenant) {
      return res.status(400).json({ error: 'Tenant parameter is required' });
    }
    
    const organization = await prisma.organization.findUnique({
      where: { subdomain: tenant }
    });
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    console.log('[ADMIN-STATS] Dohvaćam statistike za organizaciju:', organization.name, '(ID:', organization.id, ')');
    
    // Test konekcije prema bazi
    const { testDatabaseConnection } = await import('../utils/prisma.js');
    const connectionOk = await testDatabaseConnection();
    if (!connectionOk) {
      console.error('[ADMIN-STATS] Nema konekcije prema bazi');
      return res.status(500).json({ error: 'Database connection failed' });
    }
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // PARALELNI upiti s filtriranjem po organizaciji
    // VAŽNO: Koristi activity_hours (tekuća + prošla godina) umjesto total_hours za aktivne članove
    const [totalMembers, registeredMembers, activeMembers, pendingRegistrations, recentActivities] = await Promise.allSettled([
      prisma.member.count({ where: { organization_id: organization.id } }),
      prisma.member.count({ where: { organization_id: organization.id, registration_completed: true } }),
      prisma.member.count({ where: { organization_id: organization.id, status: 'registered', activity_hours: { gte: 20 } } }),
      // Pending registracije: članovi bez broja članske iskaznice (lozinka se dodjeljuje automatski s brojem iskaznice)
      // Uključuje: 1) članove bez membership_details zapisa, 2) članove s membership_details ali bez card_number
      prisma.member.count({ 
        where: { 
          organization_id: organization.id,
          status: 'pending'
        } 
      }),
      prisma.activity.count({ where: { organization_id: organization.id, created_at: { gte: thirtyDaysAgo } } })
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
    
    // Dohvati sve članove
    const members = await prisma.member.findMany({
      where: {
        role: {
          not: 'system'
        }
      },
      select: {
        member_id: true,
        status: true
      },
      orderBy: {
        member_id: 'asc'
      }
    });
    
    console.log(`Found ${members.length} members to check`);
    
    let updatedCount = 0;
    let noChangeCount = 0;
    const updatedMembers = [];
    
    // Za svakog člana provjeri ima li aktivnih perioda članstva
    for (const member of members) {
      // Dohvati aktivne periode članstva (bez end_date)
      const activeCount = await prisma.membershipPeriod.count({
        where: {
          member_id: member.member_id,
          end_date: null
        }
      });
      
      const totalPeriodsCount = await prisma.membershipPeriod.count({
        where: {
          member_id: member.member_id
        }
      });

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
        await prisma.member.update({
          where: { member_id: member.member_id },
          data: { status: shouldBeStatus }
        });
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

// Endpoint za masovno ažuriranje total_hours za sve članove (ograničeno na prošlu i tekuću godinu)
router.post('/update-all-member-hours', authenticateToken, checkRole(['member_superuser']), async (req: AuthRequest, res: Response) => {
  try {
    console.log('Pokretanje masovnog ažuriranja total_hours za sve članove...');
    
    await updateAllMembersTotalHours();
    
    return res.json({
      message: 'Masovno ažuriranje total_hours za sve članove je uspješno završeno. Provjerite server logove za detalje.'
    });
  } catch (error) {
    console.error('Greška prilikom masovnog ažuriranja total_hours:', error);
    return res.status(500).json({ 
      error: 'Neuspješno masovno ažuriranje total_hours',
      details: error instanceof Error ? error.message : 'Nepoznata greška'
    });
  }
});

export default router;
