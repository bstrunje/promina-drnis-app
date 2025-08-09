// backend/src/controllers/member.controller.ts
import type { Request, Response } from 'express';
import memberService from "../services/member.service.js";
import memberRepository from "../repositories/member.repository.js";
import { parseDate, formatDate } from '../utils/dateUtils.js';
import prisma from "../utils/prisma.js";

// Tip proširenja `req.user` je centraliziran u `backend/src/global.d.ts`.

function handleControllerError(error: unknown, res: Response): void {
  console.error("Controller error:", error);
  if (error instanceof Error) {
    if (error.message.includes("not found")) {
      res.status(404).json({ message: error.message });
    } else {
      res.status(500).json({ message: error.message });
    }
  } else {
    res.status(500).json({ message: "Unknown error" });
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
      res.status(401).json({ message: 'Unauthorized access' });
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
      if (isNaN(memberId)) {
        res.status(400).json({ message: "Invalid member ID" });
        return;
      }

      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      const member = await memberService.getMemberById(memberId);
      if (member === null) {
        res.status(404).json({ message: "Member not found" });
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
