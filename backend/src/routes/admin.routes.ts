import express, { Response } from 'express';
import permissionsController from '../controllers/permissions.controller.js';
import { authMiddleware as authenticateToken, checkRole } from '../middleware/authMiddleware.js';
import type { Request } from 'express';
import type { DatabaseUser } from '../middleware/authMiddleware.js';
import prisma from '../utils/prisma.js';
import { updateAllMembersTotalHours } from '../services/member.service.js';
import {
  determineDetailedMembershipStatus,
  getCurrentYear as getCurrentYearForStatus,
  type MemberStatusData,
  type MembershipPeriod as StatusMembershipPeriod
} from '../shared/types/memberStatus.types.js';


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
    
    // Aktivitete računamo posebno, ali Members sekcija i pending registracije koriste centraliziranu logiku
    const recentActivities = await prisma.activity.count({
      where: { organization_id: organization.id, created_at: { gte: thirtyDaysAgo } }
    });

    // Pending registracije i Members sekcija računaju se centraliziranom logikom (isti helper kao i za System Manager dashboard)
    const membersForStatus = await prisma.member.findMany({
      where: { organization_id: organization.id },
      include: {
        membership_details: true,
        periods: true
      }
    });

    const currentYear = getCurrentYearForStatus();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999);

    // System settings za activityHoursThreshold (isti prag kao na System Manager dashboardu)
    const systemSettings = await prisma.systemSettings.findUnique({ where: { organization_id: organization.id } });
    const activityHoursThreshold = systemSettings?.activityHoursThreshold ?? 20;

    let pendingRegistrations = 0;
    let totalMembers = 0;
    let registeredMembers = 0;
    let activeMembers = 0;

    for (const member of membersForStatus) {
      const activityHours = member.activity_hours != null
        ? Number(member.activity_hours as unknown as number)
        : undefined;

      const statusData: MemberStatusData = {
        status: member.status as MemberStatusData['status'],
        activity_hours: activityHours,
        membership_details: member.membership_details
          ? {
              fee_payment_year: member.membership_details.fee_payment_year ?? undefined,
              fee_payment_date: member.membership_details.fee_payment_date
                ? member.membership_details.fee_payment_date.toISOString()
                : undefined,
              card_number: member.membership_details.card_number ?? undefined
            }
          : undefined
      };

      const periodsForStatus: StatusMembershipPeriod[] = member.periods.map(period => ({
        period_id: period.period_id,
        start_date: period.start_date.toISOString(),
        end_date: period.end_date ? period.end_date.toISOString() : null,
        end_reason: (period.end_reason ?? null) as StatusMembershipPeriod['end_reason']
      }));

      const detailedStatus = determineDetailedMembershipStatus(statusData, periodsForStatus, currentYear);

      // Pending registracije brojimo preko centralnog helpera za SVE članove
      if (detailedStatus.status === 'pending') {
        pendingRegistrations++;
      }

      // Members sekcija u dashboardu računa samo članove s barem jednim otvorenim periodom u tekućoj godini
      const hasOpenPeriodInCurrentYear = member.periods.some(period => {
        const start = period.start_date;
        const end = period.end_date ?? null;

        const overlaps = start <= yearEnd && (!end || end >= yearStart);
        const isOpen = !end;
        return overlaps && isOpen;
      });

      if (!hasOpenPeriodInCurrentYear) {
        continue;
      }

      totalMembers++;

      if (detailedStatus.status === 'registered') {
        registeredMembers++;

        if (activityHours !== undefined) {
          const activityHoursInHours = activityHours / 60;
          if (activityHoursInHours >= activityHoursThreshold) {
            activeMembers++;
          }
        }
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[ADMIN-STATS] Izračun statusa članova za pending registracije i members sekciju:', {
        ukupnoClanova: membersForStatus.length,
        totalMembers,
        registeredMembers,
        activeMembers,
        activityHoursThreshold,
        pendingRegistrations
      });
    }
    
    // Sistemske informacije - bez čitanja datotečnog sustava (sporo na serverless)
    const systemHealth = "Optimal";
    const lastBackup = "Managed by Vercel"; // Serverless ne koristi lokalne backup datoteke
    
    // Cache headers za smanjenje opterećenja
    res.set('Cache-Control', 'public, max-age=60'); // 1 minuta cache
    
    res.json({
      totalMembers,
      registeredMembers,
      activeMembers,
      pendingRegistrations,
      recentActivities,
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
