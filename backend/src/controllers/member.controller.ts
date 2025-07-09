// backend/src/controllers/member.controller.ts
import type { Request, Response } from 'express';
import memberService from "../services/member.service.js";
import memberRepository from "../repositories/member.repository.js";
import { getCurrentDate, parseDate, formatDate } from '../utils/dateUtils.js';
import { DatabaseUser } from "../middleware/authMiddleware.js";
import prisma from "../utils/prisma.js";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: DatabaseUser;
    }
  }
}

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
 */
export const getMemberDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const memberId = req.user?.id;
    if (!memberId) {
      res.status(401).json({ message: 'Unauthorized access' });
      return;
    }

    let unreadMessages = 0;
    try {
      unreadMessages = await prisma.memberMessage.count({
        where: {
          recipient_statuses: {
            some: {
              recipient_member_id: memberId,
              status: 'unread'
            }
          }
        }
      });
    } catch (error) {
      console.error("Error fetching unread messages:", error);
    }

    let recentActivities = 0;
    try {
      const thirtyDaysAgo = new Date(getCurrentDate());
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      recentActivities = await (prisma as any).activity.count({
        where: {
          organizer_id: memberId,
          created_at: {
            gte: thirtyDaysAgo
          }
        }
      });
    } catch (error) {
      console.error("Error fetching recent activities:", error);
    }

    let memberCount = 0;
    try {
      const members = await prisma.member.findMany({
        where: { status: 'registered' },
      });
      memberCount = members.length;
    } catch (e) {
      console.error('Greška pri brojanju članova', e);
    }

    res.status(200).json({
      unreadMessages,
      recentActivities,
      memberCount
    });
  } catch (error) {
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
