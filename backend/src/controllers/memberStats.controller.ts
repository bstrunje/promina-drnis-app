// backend/src/controllers/memberStats.controller.ts
import { Request, Response } from 'express';
import memberService from '../services/member.service.js';
import prisma from '../utils/prisma.js';
import { getCurrentDate, parseDate, formatDate } from '../utils/dateUtils.js';
import { DatabaseUser } from '../middleware/authMiddleware.js';
import { handleControllerError } from '../utils/controllerUtils.js';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: DatabaseUser;
    }
  }
}

const memberStatsController = {
  async getMemberDashboardStats(req: Request, res: Response): Promise<void> {
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
                status: 'unread',
              },
            },
          },
        });
      } catch (error) {
        console.error('Error fetching unread messages:', error);
      }

      let recentActivities = 0;
      try {
        const thirtyDaysAgo = new Date(getCurrentDate());
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        recentActivities = await (prisma as any).activity.count({
          where: {
            organizer_id: memberId,
            created_at: {
              gte: thirtyDaysAgo,
            },
          },
        });
      } catch (error) {
        console.error('Error fetching recent activities:', error);
      }

      const currentYear = getCurrentDate().getFullYear();
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
        memberCount,
      });
    } catch (error) {
      handleControllerError(error, res);
    }
  },

  async getMemberStats(
    req: Request<{ memberId: string }>,
    res: Response
  ): Promise<void> {
    try {
      const memberId = parseInt(req.params.memberId, 10);
      const stats = await memberService.getMemberStats(memberId);
      res.json(stats);
    } catch (error) {
      handleControllerError(error, res);
    }
  },

  async getMemberAnnualStats(
    req: Request<{ memberId: string }>,
    res: Response
  ): Promise<void> {
    try {
      const memberId = parseInt(req.params.memberId, 10);
      const stats = await memberService.getMemberAnnualStats(memberId);
      res.json(stats);
    } catch (error) {
      handleControllerError(error, res);
    }
  },

  async getMemberWithActivities(
    req: Request<{ memberId: string }>,
    res: Response
  ): Promise<void> {
    try {
      const memberId = parseInt(req.params.memberId, 10);
      const member = await memberService.getMemberWithActivities(memberId);
      res.json(member);
    } catch (error) {
      handleControllerError(error, res);
    }
  },
};

export default memberStatsController;
