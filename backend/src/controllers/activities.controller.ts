import { Request, Response, NextFunction } from 'express';
import * as activityService from '../services/activities.service.js';
import { tBackend } from '../utils/i18n.js';

// --- Tipovi Aktivnosti ---

export const getActivityTypes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activityTypes = await activityService.getActivityTypesService(req);
    res.status(200).json(activityTypes);
  } catch (error) {
    next(error);
  }
};

// --- Aktivnosti --- //

export const createActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizer_id = req.user?.id;
    const locale = req.locale;
    
    if (!organizer_id) {
      return res.status(401).json({ 
        code: 'UNAUTHORIZED',
        message: tBackend('auth.unauthorized', locale)
      });
    }

    const activity = await activityService.createActivityService(req, req.body, organizer_id);
    // Serijalizacija Date objekata
    const serialized = JSON.parse(JSON.stringify(activity));
    res.status(201).json(serialized);
  } catch (error) {
    next(error);
  }
};

export const getAllActivities = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activities = await activityService.getAllActivitiesService(req);
    // Serijalizacija Date objekata
    const serialized = JSON.parse(JSON.stringify(activities));
    res.status(200).json(serialized);
  } catch (error) {
    next(error);
  }
};

/**
 * Dohvaća sve aktivnosti s detaljima o sudionicima
 * @route GET /api/activities/with-participants
 */
export const getActivitiesByYearWithParticipants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const year = parseInt(req.params.year, 10);
    const locale = req.locale;
    if (isNaN(year)) {
      return res.status(400).json({
        code: 'INVALID_YEAR',
        message: tBackend('validations.invalid_year', locale)
      });
    }
    const activities = await activityService.getActivitiesByYearWithParticipantsService(req, year);
    // Serijalizacija Date objekata
    const serialized = JSON.parse(JSON.stringify(activities));
    res.status(200).json(serialized);
  } catch (error) {
    next(error);
  }
};

export const getAllActivitiesWithParticipants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activities = await activityService.getAllActivitiesWithParticipantsService(req);
    // Serijalizacija Date objekata
    const serialized = JSON.parse(JSON.stringify(activities));
    res.status(200).json(serialized);
  } catch (error) {
    next(error);
  }
};

export const getActivityById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.activityId, 10);
    const activity = await activityService.getActivityByIdService(req, id);
    // Serijalizacija Date objekata
    const serialized = JSON.parse(JSON.stringify(activity));
    res.status(200).json(serialized);
  } catch (error) {
    next(error);
  }
};

export const getActivitiesByTypeId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const typeId = parseInt(req.params.typeId, 10);
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
    const activities = await activityService.getActivitiesByTypeIdService(req, typeId, year);
    // Serijalizacija Date objekata
    const serialized = JSON.parse(JSON.stringify(activities));
    res.status(200).json(serialized);
  } catch (error) {
    next(error);
  }
};

export const getActivitiesByMemberId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const memberId = parseInt(req.params.memberId, 10);
    const activities = await activityService.getActivitiesByMemberIdService(req, memberId);
    // Serijalizacija Date objekata
    const serialized = JSON.parse(JSON.stringify(activities));
    res.status(200).json(serialized);
  } catch (error) {
    next(error);
  }
};

export const getActivitiesByStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.params;
    const activities = await activityService.getActivitiesByStatusService(req, status);
    // Serijalizacija Date objekata
    const serialized = JSON.parse(JSON.stringify(activities));
    res.status(200).json(serialized);
  } catch (error) {
    next(error);
  }
};

export const getParticipationsByMemberIdAndYear = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const memberId = parseInt(req.params.memberId, 10);
    const year = parseInt(req.params.year, 10);
    const participations = await activityService.getParticipationsByMemberIdAndYearService(req, memberId, year);
    // Serijalizacija Date objekata
    const serialized = JSON.parse(JSON.stringify(participations));
    res.status(200).json(serialized);
  } catch (error) {
    next(error);
  }
};

export const updateActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.activityId, 10);
    const activity = await activityService.updateActivityService(req, id, req.body);
    // Serijalizacija Date objekata
    const serialized = JSON.parse(JSON.stringify(activity));
    res.status(200).json(serialized);
  } catch (error) {
    next(error);
  }
};

export const cancelActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activity_id = parseInt(req.params.activityId, 10);
    const { cancellation_reason } = req.body;

    const locale = req.locale;
    if (!cancellation_reason) {
      return res.status(400).json({
        code: 'MISSING_CANCELLATION_REASON',
        message: tBackend('validations.missing_cancellation_reason', locale)
      });
    }

    const updatedActivity = await activityService.cancelActivityService(req, activity_id, cancellation_reason);
    // Serijalizacija Date objekata
    const serialized = JSON.parse(JSON.stringify(updatedActivity));
    res.status(200).json(serialized);
  } catch (error) {
    next(error);
  }
};

export const deleteActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.activityId, 10);
    await activityService.deleteActivityService(req, id);
    res.status(204).send(); // No Content
  } catch (error) {
    next(error);
  }
};

// --- Sudionici (Participants) --- //

export const joinActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activity_id = parseInt(req.params.activityId, 10);
    const member_id = req.user?.member_id;
    const locale = req.locale;

    if (!member_id) {
      return res.status(401).json({ 
        code: 'UNAUTHORIZED',
        message: tBackend('auth.unauthorized', locale)
      });
    }

    const participation = await activityService.addParticipantService(req, activity_id, member_id);
    // Serijalizacija Date objekata
    const serialized = JSON.parse(JSON.stringify(participation));
    res.status(201).json(serialized);
  } catch (error) {
    next(error);
  }
};

export const leaveActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activity_id = parseInt(req.params.activityId, 10);
    const member_id = req.user?.member_id;
    const locale = req.locale;

    if (!member_id) {
      return res.status(401).json({ 
        code: 'UNAUTHORIZED',
        message: tBackend('auth.unauthorized', locale)
      });
    }

    await activityService.leaveActivityService(req, activity_id, member_id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const addParticipantToActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { activityId, memberId } = req.params;
    const locale = req.locale;
    
    const activity_id = parseInt(activityId, 10);
    const member_id = parseInt(memberId, 10);
    
    if (isNaN(activity_id) || isNaN(member_id)) {
      return res.status(400).json({
        code: 'INVALID_INPUT',
        message: tBackend('validations.invalid_input', locale)
      });
    }
    
    const participation = await activityService.addParticipantService(req, activity_id, member_id);
    // Serijalizacija Date objekata
    const serialized = JSON.parse(JSON.stringify(participation));
    res.status(201).json(serialized);
  } catch (error) {
    next(error);
  }
};

export const removeParticipantFromActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { activityId, memberId } = req.params;
    const locale = req.locale;
    
    const activity_id = parseInt(activityId, 10);
    const member_id = parseInt(memberId, 10);
    
    if (isNaN(activity_id) || isNaN(member_id)) {
      return res.status(400).json({
        code: 'INVALID_INPUT',
        message: tBackend('validations.invalid_input', locale)
      });
    }
    
    await activityService.removeParticipantFromActivityService(req, activity_id, member_id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const updateParticipationDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.participationId, 10);
    const locale = req.locale;
    
    if (isNaN(id)) {
      return res.status(400).json({
        code: 'INVALID_INPUT',
        message: tBackend('validations.invalid_input', locale)
      });
    }
    
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        code: 'MISSING_DATA',
        message: tBackend('validations.missing_data', locale)
      });
    }
    
    const updatedParticipation = await activityService.updateParticipationService(req, id, req.body);
    
    if (!updatedParticipation) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: tBackend('errors.not_found', locale)
      });
    }
    
    // Serijalizacija Date objekata
    const serialized = JSON.parse(JSON.stringify(updatedParticipation));
    res.status(200).json(serialized);
  } catch (error) {
    next(error);
  }
};
