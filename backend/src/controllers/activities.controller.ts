import { Request, Response, NextFunction } from 'express';
import * as activityService from '../services/activities.service.js';


// --- Tipovi Aktivnosti ---

export const getActivityTypes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activityTypes = await activityService.getActivityTypesService();
    res.status(200).json(activityTypes);
  } catch (error) {
    next(error);
  }
};

// --- Aktivnosti --- //

export const createActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizer_id = req.user?.id;
    if (!organizer_id) {
      return res.status(401).json({ message: 'Unauthorized: User ID is missing.' });
    }

    const activity = await activityService.createActivityService(req.body, organizer_id);
    res.status(201).json(activity);
  } catch (error) {
    next(error);
  }
};

export const getAllActivities = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activities = await activityService.getAllActivitiesService();
    res.status(200).json(activities);
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
    if (isNaN(year)) {
      return res.status(400).json({ message: 'Invalid year provided.' });
    }
    const activities = await activityService.getActivitiesByYearWithParticipantsService(year);
    res.status(200).json(activities);
  } catch (error) {
    next(error);
  }
};

export const getAllActivitiesWithParticipants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activities = await activityService.getAllActivitiesWithParticipantsService();
    res.status(200).json(activities);
  } catch (error) {
    next(error);
  }
};

export const getActivityById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.activityId, 10);
    const activity = await activityService.getActivityByIdService(id);
    res.status(200).json(activity);
  } catch (error) {
    next(error);
  }
};

export const getActivitiesByTypeId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const typeId = parseInt(req.params.typeId, 10);
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
    const activities = await activityService.getActivitiesByTypeIdService(typeId, year);
    res.status(200).json(activities);
  } catch (error) {
    next(error);
  }
};

export const getActivitiesByMemberId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const memberId = parseInt(req.params.memberId, 10);
    const activities = await activityService.getActivitiesByMemberIdService(memberId);
    res.status(200).json(activities);
  } catch (error) {
    next(error);
  }
};

export const getActivitiesByStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.params;
    const activities = await activityService.getActivitiesByStatusService(status);
    res.status(200).json(activities);
  } catch (error) {
    next(error);
  }
};

export const getParticipationsByMemberIdAndYear = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const memberId = parseInt(req.params.memberId, 10);
    const year = parseInt(req.params.year, 10);
    const participations = await activityService.getParticipationsByMemberIdAndYearService(memberId, year);
    res.status(200).json(participations);
  } catch (error) {
    next(error);
  }
};

export const updateActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.activityId, 10);
    const activity = await activityService.updateActivityService(id, req.body);
    res.status(200).json(activity);
  } catch (error) {
    next(error);
  }
};

export const cancelActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activity_id = parseInt(req.params.activityId, 10);
    const { cancellation_reason } = req.body;

    if (!cancellation_reason) {
      return res.status(400).json({ message: 'Cancellation reason is required.' });
    }

    const updatedActivity = await activityService.cancelActivityService(activity_id, cancellation_reason);
    res.status(200).json(updatedActivity);
  } catch (error: any) {
    next(error);
  }
};

export const deleteActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.activityId, 10);
    await activityService.deleteActivityService(id);
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

    if (!member_id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const participation = await activityService.addParticipantService(activity_id, member_id);
    res.status(201).json(participation);
  } catch (error) {
    next(error);
  }
};

export const leaveActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activity_id = parseInt(req.params.activityId, 10);
    const member_id = req.user?.member_id;

    if (!member_id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    await activityService.leaveActivityService(activity_id, member_id);
    res.status(204).send(); // No Content
  } catch (error) {
    next(error);
  }
};

export const addParticipantToActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { activityId, memberId } = req.params;
    const participation = await activityService.addParticipantService(
      parseInt(activityId, 10),
      parseInt(memberId, 10)
    );
    res.status(201).json(participation);
  } catch (error) {
    next(error);
  }
};

export const removeParticipantFromActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { activityId, memberId } = req.params;
    await activityService.removeParticipantFromActivityService(
      parseInt(activityId, 10),
      parseInt(memberId, 10)
    );
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const updateParticipationDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.participationId, 10);
    
    // DEBUG: Logiranje payloada koji dolazi s frontenda
    console.log('DEBUG updateParticipationDetails: participationId=', id);
    console.log('DEBUG updateParticipationDetails: req.body=', JSON.stringify(req.body, null, 2));
    console.log('DEBUG updateParticipationDetails: start_time tip=', typeof req.body.start_time);
    console.log('DEBUG updateParticipationDetails: start_time vrijednost=', req.body.start_time);
    
    const updatedParticipation = await activityService.updateParticipationService(id, req.body);
    res.status(200).json(updatedParticipation);
  } catch (error) {
    next(error);
  }
};
