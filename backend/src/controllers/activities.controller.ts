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
    const activity = await activityService.createActivityService(req.body);
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

export const getActivityById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.activityId, 10);
    const activity = await activityService.getActivityByIdService(id);
    res.status(200).json(activity);
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

export const addParticipantToActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { activityId, memberId } = req.params;
    const participation = await activityService.addParticipantToActivityService(
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
    const updatedParticipation = await activityService.updateParticipationService(id, req.body);
    res.status(200).json(updatedParticipation);
  } catch (error) {
    next(error);
  }
};
