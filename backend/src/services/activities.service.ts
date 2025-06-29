import { Prisma } from '@prisma/client';
import * as activityRepository from '../repositories/activities.repository.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';

// --- Tipovi Aktivnosti --- //

export const getActivityTypesService = async () => {
  return activityRepository.findAllActivityTypes();
};

export const getActivityTypesServiceNew = async () => {
  return activityRepository.findAllActivityTypes();
};

// --- Aktivnosti --- //

export const createActivityService = async (data: any, organizer_id: number) => {
  const { activity_type_id, participant_ids, ...rest } = data;

  if (!activity_type_id) {
    throw new Error('Activity type ID is required.');
  }

  const activityData: Prisma.ActivityUncheckedCreateInput = {
    ...rest,
    organizer_id,
    type_id: activity_type_id,
    participants: participant_ids && participant_ids.length > 0 ? {
      create: participant_ids.map((id: number) => ({
        member_id: id,
      })),
    } : undefined,
  };

  return activityRepository.createActivity(activityData);
};

export const getAllActivitiesService = async () => {
  return activityRepository.findAllActivities();
};

export const getActivityByIdService = async (activity_id: number) => {
  const activity = await activityRepository.findActivityById(activity_id);
  if (!activity) {
    throw new NotFoundError('Aktivnost nije pronađena.');
  }
  return activity;
};

export const getActivitiesByTypeIdService = async (type_id: number) => {
  return activityRepository.findActivitiesByTypeId(type_id);
};

export const updateActivityService = async (activityId: number, data: any) => {
  await getActivityByIdService(activityId); // Prvo provjeravamo postoji li aktivnost
  return activityRepository.updateActivity(activityId, data);
};

export const deleteActivityService = async (activity_id: number) => {
  await getActivityByIdService(activity_id); // Prvo provjeravamo postoji li aktivnost
  return activityRepository.deleteActivity(activity_id);
};

// --- Sudionici (Participants) --- //

export const addParticipantToActivityService = async (activity_id: number, member_id: number) => {
  // Provjera postoji li aktivnost
  await getActivityByIdService(activity_id);

  // Provjera postoji li član već kao sudionik
  const existingParticipation = await activityRepository.findParticipation(activity_id, member_id);
  if (existingParticipation) {
    throw new ConflictError('Član je već prijavljen na ovu aktivnost.');
  }

  return activityRepository.addParticipant(activity_id, member_id);
};

export const removeParticipantFromActivityService = async (activity_id: number, member_id: number) => {
  const participation = await activityRepository.findParticipation(activity_id, member_id);
  if (!participation) {
    throw new NotFoundError('Član nije pronađen kao sudionik na ovoj aktivnosti.');
  }
  return activityRepository.removeParticipant(activity_id, member_id);
};

export const updateParticipationService = async (
  participation_id: number,
  data: Prisma.ActivityParticipationUncheckedUpdateInput
) => {
  // Ovdje se može dodati provjera da li zapis o sudjelovanju postoji
  return activityRepository.updateParticipation(participation_id, data);
};
