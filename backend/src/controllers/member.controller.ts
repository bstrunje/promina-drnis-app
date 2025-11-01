// backend/src/controllers/member.controller.ts
import type { Request, Response } from 'express';
import { format as formatDate } from 'date-fns';
import prisma from '../utils/prisma.js';
import memberService from "../services/member.service.js";
import memberRepository from '../repositories/member.repository.js';
import { getOrganizationId } from '../utils/tenant.helper.js';
import { tBackend } from '../utils/i18n.js';

// Tip proširenja `req.user` je centraliziran u `backend/src/global.d.ts`.

function handleControllerError(error: unknown, req: Request, res: Response): void {
  const locale = req.locale;
  console.error("Controller error:", error);
  
  if (error instanceof Error) {
    if (error.message.includes("not found")) {
      res.status(404).json({ 
        code: 'NOT_FOUND',
        message: tBackend('errors.server_error', locale, { details: error.message })
      });
    } else {
      res.status(500).json({
        code: 'SERVER_ERROR',
        message: tBackend('errors.server_error', locale, { details: error.message })
      });
    }
  } else {
    res.status(500).json({
      code: 'UNKNOWN_ERROR',
      message: tBackend('errors.unknown', locale)
    });
  }
}

/**
 * Dohvaća statistike za članski dashboard
 * Vraća broj nepročitanih poruka, nedavnih aktivnosti i ukupan broj članova
 * Optimizirano za Vercel serverless okruženje
 */
export const getMemberDashboardStats = async (req: Request, res: Response): Promise<void> => {
  const locale = req.locale || 'en';
  
  try {
    const memberId = req.user?.id;
    if (!memberId) {
      res.status(401).json({ 
        code: 'UNAUTHORIZED',
        message: tBackend('auth.unauthorized', locale)
      });
      return;
    }

    // Paralelno izvršavanje upita za bolje performanse
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // MULTI-TENANCY: Dohvati organization_id iz middleware-a
    const organizationId = req.organizationId;
    if (!organizationId) {
      res.status(400).json({ 
        code: 'MISSING_TENANT',
        message: tBackend('tenant.required', locale)
      });
      return;
    }

    const [unreadMessages, recentActivities, memberCount] = await Promise.allSettled([
      // Optimizirani upit za nepročitane poruke (filtrirano po tenant-u)
      prisma.memberMessage.count({
        where: {
          organization_id: organizationId, // MULTI-TENANCY filter
          recipient_statuses: {
            some: {
              recipient_member_id: memberId,
              status: 'unread'
            }
          }
        }
      }),
      
      // Optimizirani upit za nedavne aktivnosti (filtrirano po tenant-u)
      prisma.activity.count({
        where: {
          organization_id: organizationId, // MULTI-TENANCY filter
          created_at: {
            gte: thirtyDaysAgo
          }
        }
      }),
      
      // Optimizirani upit za broj članova (filtrirano po tenant-u)
      prisma.member.count({
        where: { 
          organization_id: organizationId, // MULTI-TENANCY filter
          status: 'registered' 
        }
      })
    ]);

    const response = {
      unreadMessages: unreadMessages.status === 'fulfilled' ? unreadMessages.value : 0,
      recentActivities: recentActivities.status === 'fulfilled' ? recentActivities.value : 0,
      memberCount: memberCount.status === 'fulfilled' ? memberCount.value : 0
    };

    // Dodaj cache headers za bolje performanse
    res.setHeader('Cache-Control', 'public, max-age=30'); // Cache 30 sekundi
    res.status(200).json(response);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    handleControllerError(error, req, res);
  }
};

export const memberController = {
  async getAllMembers(req: Request, res: Response): Promise<void> {
    const locale = req.locale;
    
    try {
      const organizationId = getOrganizationId(req);
      // Poštuj query parametar status=active (alias: status=registered) kako bi se vratili samo članovi s aktivnim periodom
      const statusParam = typeof req.query.status === 'string' ? req.query.status.toLowerCase() : undefined;
      const activeOnly = statusParam === 'active' || statusParam === 'registered';

      const members = await memberRepository.findAll(organizationId, activeOnly);
      res.json(members);
    } catch (error) {
      console.error('Error in getAllMembers:', error);
      res.status(500).json({
        code: 'FETCH_MEMBERS_FAILED',
        message: tBackend('members.fetch_failed', locale),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  async getMemberById(
    req: Request<{ memberId: string }>,
    res: Response
  ): Promise<void> {
    const locale = req.locale || 'en';
    
    try {
      const memberId = parseInt(req.params.memberId, 10);
      if (isNaN(memberId)) {
        res.status(400).json({ 
          code: 'INVALID_MEMBER_ID',
          message: tBackend('members.invalid_id', locale)
        });
        return;
      }

      const organizationId = getOrganizationId(req);
      const member = await memberRepository.findById(organizationId, memberId);
      if (!member) {
        res.status(404).json({ 
          code: 'MEMBER_NOT_FOUND',
          message: tBackend('members.not_found', locale, { id: memberId })
        });
        return;
      }

      // Postavi HTTP zaglavlja za sprječavanje cache-anja
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      const memberDetails = await memberService.getMemberById(req, memberId);
      if (memberDetails === null) {
        res.status(404).json({ 
          code: 'MEMBER_NOT_FOUND',
          message: tBackend('members.not_found', locale, { id: memberId })
        });
      } else {
        if (memberDetails.membership_details?.fee_payment_date) {
          const paymentDate = memberDetails.membership_details.fee_payment_date;
          const isDateObject = typeof paymentDate === 'object' && 
                              paymentDate !== null && 
                              'getTime' in paymentDate;
          
          if (isDateObject) {
            memberDetails.membership_details.fee_payment_date = formatDate(paymentDate as Date, 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'');
          } else if (typeof paymentDate === 'string') {
            memberDetails.membership_details.fee_payment_date = formatDate(new Date(paymentDate), 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'');
          }
        }

        res.json(memberDetails);
      }
    } catch (error) {
      handleControllerError(error, req, res);
    }
  },
};
