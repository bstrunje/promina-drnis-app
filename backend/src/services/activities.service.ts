import { ActivityStatus, Prisma } from '@prisma/client';
import * as activityRepository from '../repositories/activities.repository.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import prisma from '../utils/prisma.js';

const determineActivityStatus = (
  startTime: string | Date | null | undefined,
  endTime: string | Date | null | undefined
): ActivityStatus => {
  if (startTime && endTime) {
    return 'COMPLETED';
  }
  if (startTime) {
    return 'ACTIVE';
  }
  return 'PLANNED';
};

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

  // Određivanje statusa na temelju datuma
  const status = determineActivityStatus(rest.actual_start_time, rest.actual_end_time);

  const activityData: Prisma.ActivityUncheckedCreateInput = {
    ...rest,
    organizer_id,
    type_id: activity_type_id,
    status, // Postavljanje statusa
    participants: participant_ids && participant_ids.length > 0 ? {
      create: participant_ids.map((id: number) => ({
        member_id: id,
        // Automatsko popunjavanje vremena sudionika
        start_time: rest.actual_start_time,
        end_time: rest.actual_end_time,
      })),
    } : undefined,
  };

  return activityRepository.createActivity(activityData);
};

export const getAllActivitiesService = async () => {
  return activityRepository.findAllActivities();
};

export const getActivityByIdService = async (activity_id: number) => {
  const activity = await prisma.activity.findUnique({
    where: { activity_id },
    include: {
      activity_type: true,
      organizer: {
        select: {
          member_id: true,
          first_name: true,
          last_name: true,
          full_name: true, // Eksplicitno dohvaćanje
        },
      },
      participants: {
        include: {
          member: {
            select: {
              member_id: true,
              first_name: true,
              last_name: true,
              full_name: true, // Eksplicitno dohvaćanje
            },
          },
        },
      },
      _count: {
        select: { participants: true },
      },
    },
  });

  if (!activity) {
    throw new NotFoundError('Aktivnost nije pronađena.');
  }

  return activity;
};

export const getActivitiesByTypeIdService = async (type_id: number) => {
  return activityRepository.findActivitiesByTypeId(type_id);
};

export const updateActivityService = async (activity_id: number, data: any) => {
  const existingActivity = await getActivityByIdService(activity_id); // Prvo provjeravamo postoji li aktivnost

  const { participant_ids, ...activityData } = data;

  // Rješavanje konačnih vrijednosti za vremena kako bi se izbjegle greške u tipovima
  const finalStartTime = activityData.actual_start_time ?? existingActivity.actual_start_time;
  const finalEndTime = activityData.actual_end_time ?? existingActivity.actual_end_time;

  const updatePayload: Prisma.ActivityUpdateInput = {
    ...activityData,
  };

  // Automatsko postavljanje statusa na temelju datuma
  updatePayload.status = determineActivityStatus(finalStartTime, finalEndTime);

  // Ako su poslani sudionici, obriši stare i dodaj nove
  if (participant_ids && Array.isArray(participant_ids)) {
    updatePayload.participants = {
      deleteMany: {},
      create: participant_ids.map((id: number) => ({
        member: {
          connect: {
            member_id: id,
          },
        },
        // Postavljanje vremena za nove sudionike s ispravnim tipom
        start_time: finalStartTime,
        end_time: finalEndTime,
      })),
    };
  }

  const updatedActivity = await activityRepository.updateActivity(activity_id, updatePayload);

  // Ako nisu poslani novi sudionici, ali su se vremena promijenila,
  // ažuriraj vremena za sve postojeće sudionike.
  const timesChanged = 'actual_start_time' in activityData || 'actual_end_time' in activityData;
  if (timesChanged && !(participant_ids && Array.isArray(participant_ids))) {
    await prisma.activityParticipation.updateMany({
      where: { activity_id },
      data: {
        start_time: updatedActivity.actual_start_time,
        end_time: updatedActivity.actual_end_time,
      },
    });
  }

  // Vrati ažuriranu aktivnost s potencijalno novim podacima
  return getActivityByIdService(activity_id);
};

export const cancelActivityService = async (activity_id: number, cancellation_reason: string) => {
  // Prvo provjeravamo postoji li aktivnost
  await getActivityByIdService(activity_id);

  const updatePayload: Prisma.ActivityUpdateInput = {
    status: 'CANCELLED',
    cancellation_reason,
  };

  return activityRepository.updateActivity(activity_id, updatePayload);
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
