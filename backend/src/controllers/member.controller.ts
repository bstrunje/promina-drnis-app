// backend/src/controllers/member.controller.ts
import type { Request, Response } from 'express';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Response {
      locale?: 'en' | 'hr';
    }
  }
}
import memberService from "../services/member.service.js";
import memberRepository from "../repositories/member.repository.js";
import { parseDate, formatDate } from '../utils/dateUtils.js';
import prisma from "../utils/prisma.js";
import { tOrDefault } from '../utils/i18n.js';

// Tip proširenja `req.user` je centraliziran u `backend/src/global.d.ts`.

function handleControllerError(error: unknown, res: Response): void {
  const locale: 'en' | 'hr' = res.locale || 'hr';
  console.error("Controller error:", error);
  if (error instanceof Error) {
    if (error.message.includes("not found")) {
      res.status(404).json({ 
        message: tOrDefault('common.errors.NOT_FOUND', locale, error.message) 
      });
    } else {
      res.status(500).json({ 
        message: tOrDefault('common.errors.SERVER_ERROR', locale, error.message) 
      });
    }
  } else {
    res.status(500).json({ 
      message: tOrDefault('common.errors.UNKNOWN_ERROR', locale, 'An unknown error occurred') 
    });
  }
}

/**
 * Dohvaća statistike za članski dashboard
 * Vraća broj nepročitanih poruka, nedavnih aktivnosti i ukupan broj članova
 * Optimizirano za Vercel serverless okruženje
 */
export const getMemberDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const memberId = req.user?.id;
    if (!memberId) {
      const locale: 'en' | 'hr' = res.locale || 'hr';
      res.status(401).json({ 
        code: 'UNAUTHORIZED_ACCESS',
        message: tOrDefault('auth.errors.UNAUTHORIZED_ACCESS', locale, 'Unauthorized access')
      });
      return;
    }

    // Paralelno izvršavanje upita za bolje performanse
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const [unreadMessages, recentActivities, memberCount] = await Promise.allSettled([
      // Optimizirani upit za nepročitane poruke
      prisma.memberMessage.count({
        where: {
          recipient_statuses: {
            some: {
              recipient_member_id: memberId,
              status: 'unread'
            }
          }
        }
      }),
      
      // Optimizirani upit za nedavne aktivnosti
      prisma.activity.count({
        where: {
          created_at: {
            gte: thirtyDaysAgo
          }
        }
      }),
      
      // Optimizirani upit za broj članova - koristi count umjesto findMany
      prisma.member.count({
        where: { status: 'registered' }
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
    handleControllerError(error, res);
  }
};

export const memberController = {
  async getAllMembers(req: Request, res: Response) {
    try {
      const activeOnly = req.query.status === 'active';
      const members = await memberRepository.findAll(activeOnly);
      res.json(members);
    } catch (error) {
      handleControllerError(error, res);
    }
  },

  async getMemberById(
    req: Request<{ memberId: string }>,
    res: Response
  ): Promise<void> {
    try {
      const memberId = parseInt(req.params.memberId, 10);
      const locale: 'en' | 'hr' = res.locale || 'hr';
      if (isNaN(memberId)) {
        res.status(400).json({ 
          code: 'INVALID_MEMBER_ID',
          message: tOrDefault('member.errors.INVALID_MEMBER_ID', locale, 'Invalid member ID')
        });
        return;
      }

      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      const member = await memberService.getMemberById(memberId);
      if (member === null) {
        const locale: 'en' | 'hr' = res.locale || 'hr';
        res.status(404).json({ 
          code: 'MEMBER_NOT_FOUND',
          message: tOrDefault('member.errors.MEMBER_NOT_FOUND', locale, 'Member not found')
        });
      } else {
        if (member.membership_details?.fee_payment_date) {
          const paymentDate = member.membership_details.fee_payment_date;
          const isDateObject = typeof paymentDate === 'object' && 
                              paymentDate !== null && 
                              'getTime' in paymentDate;
          
          if (isDateObject) {
            member.membership_details.fee_payment_date = formatDate(paymentDate as Date, 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'');
          } else if (typeof paymentDate === 'string') {
            member.membership_details.fee_payment_date = formatDate(parseDate(paymentDate), 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'');
          }
        }

        res.json(member);
      }
    } catch (error) {
      handleControllerError(error, res);
    }
  },
};
