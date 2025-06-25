import { Request, Response } from 'express';
import { DatabaseUser } from '../middleware/authMiddleware.js';
import activityService from '../services/activity.service.js';
import auditService from '../services/audit.service.js';
import { Prisma } from '@prisma/client';
import { ActivityError } from '../shared/types/index.js';

declare global {
  namespace Express {
    interface Request {
      user?: DatabaseUser;
    }
  }
}

const handleControllerError = (res: Response, error: unknown) => {
  console.error('Controller error:', error);
  if (error instanceof ActivityError) {
    switch (error.type) {
      case 'NOT_FOUND':
        return res.status(404).json({ message: error.message });
      case 'VALIDATION_ERROR':
      case 'MAX_PARTICIPANTS':
        return res.status(400).json({ message: error.message });
      default:
        return res.status(500).json({ message: error.message });
    }
  }
  if (error instanceof Error) {
    return res.status(500).json({ message: error.message });
  }
  return res.status(500).json({ message: 'Unknown error' });
};

const activityController = {
  async getAllActivities(req: Request, res: Response): Promise<void> {
    try {
      const activities = await activityService.getAllActivities();
      res.json(activities);
    } catch (error) {
      handleControllerError(res, error);
    }
  },

  async getActivityById(req: Request<{ id: string }>, res: Response): Promise<void> {
    try {
      console.log('[Controller] getActivityById called with params:', req.params);
      const { id } = req.params;
      const activity = await activityService.getActivityById(id);
      res.json(activity);
    } catch (error) {
      handleControllerError(res, error);
    }
  },

  async getActivitiesByTypeId(req: Request, res: Response) {
    try {
      const { typeId } = req.params;
      const numericTypeId = parseInt(typeId, 10);
      if (isNaN(numericTypeId)) {
        return res.status(400).json({ message: 'Invalid type ID' });
      }
      const activities = await activityService.getActivitiesByTypeId(numericTypeId);
      res.json(activities);
    } catch (error) {
      handleControllerError(res, error);
    }
  },

  async createActivity(req: Request<{}, {}, Prisma.ActivityUncheckedCreateInput>, res: Response): Promise<void> {
    try {
      const activityData: Prisma.ActivityUncheckedCreateInput = {
        ...req.body,
        created_by: req.user!.id,
      };
      const activity = await activityService.createActivity(activityData);
      if (req.user?.id) {
        await auditService.logAction(
          'CREATE_ACTIVITY',
          req.user.id,
          `Created activity: ${activity.title}`,
          req,
          'success'
        );
      }
      res.status(201).json(activity);
    } catch (error) {
      handleControllerError(res, error);
    }
  },

  async updateActivity(req: Request<{ id: string }, {}, Prisma.ActivityUncheckedUpdateInput>, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const updatedActivity = await activityService.updateActivity(id, updateData);
      if (req.user?.id) {
        await auditService.logAction(
          'UPDATE_ACTIVITY',
          req.user.id,
          `Updated activity: ${updatedActivity.title}`,
          req,
          'success'
        );
      }
      res.json(updatedActivity);
    } catch (error) {
      handleControllerError(res, error);
    }
  },

  async deleteActivity(req: Request<{ id: string }>, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await activityService.deleteActivity(id);
      if (req.user?.id) {
        await auditService.logAction(
          'DELETE_ACTIVITY',
          req.user.id,
          `Deleted activity with ID: ${id}`,
          req,
          'success'
        );
      }
      res.status(204).send();
    } catch (error) {
      handleControllerError(res, error);
    }
  },

  async getAllActivityTypes(req: Request, res: Response) {
    try {
      const activityTypes = await activityService.getAllActivityTypes();
      res.json(activityTypes);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get activity types' });
    }
  },

  async getActivityTypeById(req: Request, res: Response) {
    try {
      const typeId = parseInt(req.params.id, 10);
      if (isNaN(typeId)) {
        return res.status(400).json({ message: 'Invalid type ID' });
      }
      const activityType = await activityService.getActivityTypeById(typeId);
      if (!activityType) {
        return res.status(404).json({ message: 'Activity type not found' });
      }
      res.json(activityType);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get activity type' });
    }
  },

  async getMemberActivities(req: Request<{ memberId: string }>, res: Response): Promise<void> {
    try {
      const memberId = parseInt(req.params.memberId, 10);
      const activities = await activityService.getMemberActivities(memberId);
      res.json(activities);
    } catch (error) {
      handleControllerError(res, error);
    }
  },

  async addMemberToActivity(req: Request<{ activityId: string; memberId: string }, {}, { hoursSpent: number }>, res: Response): Promise<void> {
    try {
      const { activityId, memberId } = req.params;
      const { hoursSpent } = req.body;
      const result = await activityService.addMemberToActivity(activityId, parseInt(memberId, 10), hoursSpent);
      if (req.user?.id) {
        await auditService.logAction(
          'ADD_MEMBER_TO_ACTIVITY',
          req.user.id,
          `Added member ${memberId} to activity ${activityId} with ${hoursSpent} hours`,
          req,
          'success',
          parseInt(memberId, 10)
        );
      }
      res.status(200).json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  },

  async removeMemberFromActivity(req: Request<{ activityId: string; memberId: string }>, res: Response): Promise<void> {
    try {
      const { activityId, memberId } = req.params;
      await activityService.removeMemberFromActivity(activityId, parseInt(memberId, 10));
      if (req.user?.id) {
        await auditService.logAction(
          'REMOVE_MEMBER_FROM_ACTIVITY',
          req.user.id,
          `Removed member ${memberId} from activity ${activityId}`,
          req,
          'success',
          parseInt(memberId, 10)
        );
      }
      res.json({ message: 'Member removed from activity successfully' });
    } catch (error) {
      handleControllerError(res, error);
    }
  },
};

export default activityController;