import { ActivityStatus, Prisma, PrismaClient, ParticipantRole } from '@prisma/client';
import * as activityRepository from '../repositories/activities.repository.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import prisma from '../utils/prisma.js';
import { updateMemberTotalHours, updateMemberActivityHours } from './member.service.js';
import { differenceInMinutes } from 'date-fns';
import { updateAnnualStatistics, cleanupEmptyAnnualStatistics } from './statistics.service.js';
import { getOrganizationId } from '../middleware/tenant.middleware.js';
import { Request } from 'express';

// Tip za Prisma transakcijski klijent
type TransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

// DTO tipovi za ulazne podatke (precizno umjesto any)
// Napomena: Isključivo tipizacijska poboljšanja, bez promjene ponašanja
type ParticipationInput = { member_id: number; recognition_override: number; participant_role?: ParticipantRole; manual_hours?: number };

type CreateActivityDTO = Partial<Prisma.ActivityUncheckedCreateInput> & {
  name: string; // obavezno polje prema Activity modelu
  start_date: string | Date; // obavezno prema Activity modelu
  activity_type_id: number;
  participant_ids?: number[];
  participations?: ParticipationInput[];
  recognition_percentage?: number;
  manual_hours?: number;
  actual_start_time?: string | Date | null;
  actual_end_time?: string | Date | null;
};

type UpdateActivityDTO = Partial<Prisma.ActivityUpdateInput> & {
  participant_ids?: number[];
  participations?: ParticipationInput[];
  recognition_percentage?: number;
  manual_hours?: number;
  type_id?: number;
  actual_start_time?: string | Date | null;
  actual_end_time?: string | Date | null;
};

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

export const getActivityTypesService = async (req: Request) => {
  const organizationId = getOrganizationId(req);
  return activityRepository.findAllActivityTypes(organizationId);
};

export const getActivityTypesServiceNew = async (req: Request) => {
  const organizationId = getOrganizationId(req);
  return activityRepository.findAllActivityTypes(organizationId);
};

// --- Aktivnosti --- //

export const createActivityService = async (req: Request, data: CreateActivityDTO, organizer_id: number) => {
  const organizationId = getOrganizationId(req);
  const { 
    activity_type_id, 
    participant_ids, 
    participations, // Novi parametar za sudionike s ulogama i priznavanjem
    recognition_percentage, 
    manual_hours, 
    name,
    start_date,
    ...rest 
  } = data;

  if (!activity_type_id) {
    throw new Error('Activity type ID is required.');
  }

  // Određivanje statusa na temelju datuma
  const status = determineActivityStatus(rest.actual_start_time, rest.actual_end_time);

  // Koristimo recognition_percentage iz zahtjeva ako je dostupan, inače default 100
  const recognitionValue = recognition_percentage !== undefined ? recognition_percentage : 100;

  let participantsData;
  let memberIdsForUpdate: number[] = [];

  // Provjeri imamo li podatke o sudionicima s ulogama (za izlete)
  if (participations && participations.length > 0) {
    participantsData = {
      create: participations.map((p: ParticipationInput) => ({
        organization_id: organizationId,
        member_id: p.member_id,
        // Automatsko popunjavanje vremena sudionika ili manual_hours ako je uneseno
        start_time: rest.actual_start_time ? new Date(rest.actual_start_time) : null,
        end_time: rest.actual_end_time ? new Date(rest.actual_end_time) : null,
        // Dodajemo manual_hours za sve sudionike ako je uneseno
        manual_hours: (manual_hours !== undefined && manual_hours !== null && Number(manual_hours) > 0) ? Number(manual_hours) : null,
        recognition_override: p.recognition_override, // Individualni postotak priznavanja na temelju uloge
        participant_role: p.participant_role as ParticipantRole, // SPREMANJE ULOGE
      })),
    };
    memberIdsForUpdate = participations.map((p: ParticipationInput) => p.member_id);
  } 
  // Standardni način s običnim ID-ovima sudionika (za aktivnosti koje nisu izleti)
  else if (participant_ids && participant_ids.length > 0) {
    participantsData = {
      create: participant_ids.map((id: number) => ({
        organization_id: organizationId,
        member_id: id,
        start_time: rest.actual_start_time ? new Date(rest.actual_start_time) : null,
        end_time: rest.actual_end_time ? new Date(rest.actual_end_time) : null,
        manual_hours: (manual_hours !== undefined && manual_hours !== null && Number(manual_hours) > 0) ? Number(manual_hours) : null,
        // Za aktivnosti koje nisu izleti, override je null jer se koristi percentage s aktivnosti
        recognition_override: null, 
      })),
    };
    memberIdsForUpdate = participant_ids;
  }

  const activityData: Prisma.ActivityUncheckedCreateInput = {
    ...rest,
    name,
    start_date,
    organization_id: organizationId,
    organizer_id,
    type_id: activity_type_id,
    status,
    recognition_percentage: recognitionValue,
    manual_hours: (manual_hours !== undefined && manual_hours !== null && Number(manual_hours) > 0) ? Number(manual_hours) : null,
    participants: participantsData
  };

  // Koristi transakciju za stvaranje aktivnosti i ažuriranje ukupnih sati sudionika
  return prisma.$transaction(async (tx: TransactionClient) => {
    const createdActivity = await activityRepository.createActivity(activityData, tx);
    
    // Ažuriranje ukupnih sati za sve sudionike koji su dodani unutar iste transakcije
    if (memberIdsForUpdate.length > 0) {
      for (const memberId of memberIdsForUpdate) {
        await updateMemberTotalHours(memberId, tx);
        await updateMemberActivityHours(memberId, tx);
      }
    }

    return createdActivity;
  });
};

export const getAllActivitiesService = async (req: Request) => {
  const organizationId = getOrganizationId(req);
  return activityRepository.findAllActivitiesWithParticipants(organizationId);
};

/**
 * Dohvaća sve aktivnosti s detaljima o sudionicima (koristi se za izračun sati)
 * @returns Promise<Activity[]> Lista aktivnosti s uključenim sudionicima
 */
export const getActivitiesByYearWithParticipantsService = async (req: Request, year: number) => {
  const organizationId = getOrganizationId(req);
  return activityRepository.findActivitiesByYearWithParticipants(organizationId, year);
};

export const getAllActivitiesWithParticipantsService = async (req: Request) => {
  const organizationId = getOrganizationId(req);
  return activityRepository.findAllActivitiesWithParticipants(organizationId);
};

export const getActivityByIdService = async (req: Request, activity_id: number) => {
  const organizationId = getOrganizationId(req);
  const activity = await prisma.activity.findUnique({
    where: { 
      activity_id,
      organization_id: organizationId
    },
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
        select: {
          participation_id: true,
          member_id: true,
          start_time: true,
          end_time: true,
          manual_hours: true,
          recognition_override: true,
          participant_role: true, // EKSPLICITNO DOHVAĆANJE ULOGE
          member: {
            select: {
              member_id: true,
              first_name: true,
              last_name: true,
              full_name: true,
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

  // Izračunaj priznate sate za svakog sudionika
  const participantsWithRecognizedHours = activity.participants.map(p => {
    let minuteValue = 0;

    // ISPRAVAK: Prvo provjeri individualne sate, zatim globalne, pa tek onda izračun.
    // Ovo osigurava da individualne prilagodbe imaju prednost.
    if (p.manual_hours !== null && p.manual_hours !== undefined) {
      minuteValue = Math.round(p.manual_hours * 60);
    } else if (activity.manual_hours !== null && activity.manual_hours !== undefined && activity.manual_hours > 0) {
      minuteValue = Math.round(activity.manual_hours * 60);
    } else if (activity.actual_start_time && activity.actual_end_time) {
      const minutes = differenceInMinutes(
        new Date(activity.actual_end_time),
        new Date(activity.actual_start_time)
      );
      minuteValue = minutes > 0 ? minutes : 0;
    }

    const finalRecognitionPercentage = p.recognition_override ?? activity.recognition_percentage ?? 100;
    const recognizedMinutes = Math.round(minuteValue * (finalRecognitionPercentage / 100));
    const recognizedHours = recognizedMinutes / 60;

    return {
      ...p,
      recognized_hours: recognizedHours,
    };
  });

  return {
    ...activity,
    participants: participantsWithRecognizedHours,
  };
};

export const getActivitiesByTypeIdService = async (req: Request, type_id: number, year?: number) => {
  const organizationId = getOrganizationId(req);
  const activities = await activityRepository.getActivitiesByTypeId(organizationId, type_id, year);

  // Kreiramo novi tip koji proširuje postojeći tip aktivnosti s opcionalnim manual_hours
  type ActivityWithManualHours = (typeof activities)[0] & { manual_hours?: number | null };

  const activitiesWithManualHours: ActivityWithManualHours[] = activities.map(activity => {
    // Pronalazimo prvog sudionika koji ima definirane manual_hours
    const participantWithManualHours = activity.participants.find(
      p => p.manual_hours !== null && p.manual_hours !== undefined
    );

    // Ako takav sudionik postoji, dodajemo manual_hours na objekt aktivnosti
    if (participantWithManualHours) {
      return {
        ...activity,
        manual_hours: participantWithManualHours.manual_hours,
      };
    }

    return activity;
  });

  return activitiesWithManualHours;
};

export const getActivitiesByStatusService = async (req: Request, status: string) => {
  const organizationId = getOrganizationId(req);
  // Validacija da li je prosljeđeni status validan član ActivityStatus enuma
  const activityStatus = status.toUpperCase() as ActivityStatus;
  if (!Object.values(ActivityStatus).includes(activityStatus)) {
    throw new Error(`Invalid activity status: ${status}`);
  }

  return activityRepository.findActivitiesByStatus(organizationId, activityStatus);
};

export const getActivitiesByMemberIdService = async (req: Request, member_id: number) => {
  const organizationId = getOrganizationId(req);
  return activityRepository.findActivitiesByParticipantId(organizationId, member_id);
};



export const getParticipationsByMemberIdAndYearService = async (req: Request, member_id: number, year: number) => {
  const organizationId = getOrganizationId(req);
  const participations = await activityRepository.findParticipationsByMemberIdAndYear(organizationId, member_id, year);

  // Izračunaj priznate sate za svako sudjelovanje
  const participationsWithRecognizedHours = participations.map(p => {
    let minuteValue = 0;

    if (p.activity.manual_hours !== null && p.activity.manual_hours !== undefined && p.activity.manual_hours > 0) {
      minuteValue = Math.round(p.activity.manual_hours * 60);
    } else if (p.manual_hours !== null && p.manual_hours !== undefined) {
      minuteValue = Math.round(p.manual_hours * 60);
    } else if (p.activity.actual_start_time && p.activity.actual_end_time) {
      const minutes = differenceInMinutes(
        new Date(p.activity.actual_end_time),
        new Date(p.activity.actual_start_time)
      );
      minuteValue = minutes > 0 ? minutes : 0;
    }

    const finalRecognitionPercentage = p.recognition_override ?? p.activity.recognition_percentage ?? 100;
    const recognizedMinutes = Math.round(minuteValue * (finalRecognitionPercentage / 100));
    const recognizedHours = recognizedMinutes / 60;

    return {
      ...p,
      recognized_hours: recognizedHours, // Dodajemo novo polje
    };
  });

  return participationsWithRecognizedHours;
};

export const updateActivityService = async (req: Request, activity_id: number, data: UpdateActivityDTO) => {
  const organizationId = getOrganizationId(req);
  console.log(`[DEBUG] updateActivityService pozvan za aktivnost ${activity_id} s podacima:`, JSON.stringify(data, null, 2));
  return prisma.$transaction(async (tx: TransactionClient) => {
    const existingActivity = await tx.activity.findUnique({
      where: { 
        activity_id,
        organization_id: organizationId
      },
      include: { participants: true, activity_type: true },
    });

    if (!existingActivity) {
      throw new NotFoundError('Aktivnost nije pronađena.');
    }

    const { participant_ids, manual_hours, participations, recognition_percentage, ...activityData } = data;
    console.log(`[DEBUG] Ekstraktirani manual_hours:`, manual_hours, typeof manual_hours);

    const finalStartTime = activityData.actual_start_time ?? existingActivity.actual_start_time;
    const finalEndTime = activityData.actual_end_time ?? existingActivity.actual_end_time;

    const updatePayload: Prisma.ActivityUpdateInput = {
      ...activityData,
      recognition_percentage: recognition_percentage !== undefined ? recognition_percentage : existingActivity.recognition_percentage,
      // Postavljamo manual_hours; bit će postavljeno na null na kraju transakcije
      manual_hours: manual_hours !== undefined ? (Number(manual_hours) > 0 ? Number(manual_hours) : null) : existingActivity.manual_hours,
    };

    updatePayload.status = determineActivityStatus(finalStartTime, finalEndTime);
    if (manual_hours !== undefined && manual_hours !== null && Number(manual_hours) > 0) {
      updatePayload.status = 'COMPLETED';
    }

    const oldParticipantIds = existingActivity.participants.map(p => p.member_id);
    let newParticipantIds: number[] = oldParticipantIds;

    let isExcursion = existingActivity.activity_type.name === 'IZLETI';
    if (data.type_id && data.type_id !== existingActivity.type_id) {
      const newActivityType = await tx.activityType.findUnique({ 
        where: { type_id: data.type_id }
      });
      if (newActivityType) {
        isExcursion = newActivityType.name === 'IZLETI';
      }
    }

    // 1. Ažuriranje glavnog entiteta aktivnosti
    await tx.activity.update({
      where: { activity_id: activity_id },
      data: updatePayload,
    });

    // 2. Logika za upravljanje sudionicima
    // Scenarij 1: Popis sudionika se mijenja (poslan je `participant_ids`)
    if (participant_ids) {
      const oldIdsSorted = [...oldParticipantIds].sort();
      const newIdsSorted = [...participant_ids].sort();
      const areSame = JSON.stringify(oldIdsSorted) === JSON.stringify(newIdsSorted);

      if (!areSame) {
        await tx.activityParticipation.deleteMany({ where: { activity_id: activity_id } });
        const createData = participant_ids.map((id: number) => ({
          activity_id,
          member_id: id,
          recognition_override: null,
          // Novi sudionici nasljeđuju globalne sate ili će im se izračunati automatski.
          // Njihovi individualni sati su null.
          manual_hours: updatePayload.manual_hours ? Number(updatePayload.manual_hours) : null,
        }));
        if (createData.length > 0) {
          await tx.activityParticipation.createMany({ data: createData });
        }
        newParticipantIds = participant_ids;
      }
    }

    // Scenarij 2: Poslani su individualni sati za sudionike (`participations`)
    if (participations) {
      for (const p of participations) {
        await tx.activityParticipation.updateMany({
          where: { activity_id: activity_id, member_id: p.member_id },
          data: {
            manual_hours: p.manual_hours,
            recognition_override: null, // Ručni unos ima prednost
          },
        });
      }
    } else {
      // Scenarij 3: Nisu poslani individualni sati. Svi sudionici se ažuriraju
      // ili s globalnim ručnim satima, ili im se sati resetiraju na null
      // kako bi se koristio automatski izračun.
      await tx.activityParticipation.updateMany({
        where: { activity_id: activity_id },
        data: {
          manual_hours: updatePayload.manual_hours ? Number(updatePayload.manual_hours) : null,
        },
      });
    }

    // Resetiraj recognition_override ako se tip promijenio na ne-izlet
    if (data.type_id && data.type_id !== existingActivity.type_id && !isExcursion) {
      await tx.activityParticipation.updateMany({
        where: { activity_id: activity_id },
        data: { recognition_override: null },
      });
    }

    // 4. Dohvati konačno stanje aktivnosti za povrat klijentu
    const updatedActivityWithRelations = await tx.activity.findUnique({
      where: { activity_id: activity_id },
      include: {
        activity_type: true,
        organizer: { select: { member_id: true, first_name: true, last_name: true, full_name: true } },
        participants: {
          select: {
            participation_id: true,
            member_id: true,
            start_time: true,
            end_time: true,
            manual_hours: true,
            recognition_override: true,
            participant_role: true,
            member: { select: { member_id: true, first_name: true, last_name: true, full_name: true } },
          },
        },
        _count: { select: { participants: true } },
      },
    });

    if (!updatedActivityWithRelations) {
      throw new NotFoundError('Aktivnost nije pronađena nakon ažuriranja.');
    }

    const allAffectedIds = [...new Set([...oldParticipantIds, ...newParticipantIds])];
    const year = new Date(updatedActivityWithRelations.start_date).getFullYear();

    for (const memberId of allAffectedIds) {
      await updateMemberTotalHours(memberId, tx);
      await updateMemberActivityHours(memberId, tx);
      await updateAnnualStatistics(memberId, year, tx);
    }

    // Izračunaj priznate sate za svakog sudionika, kao u getActivityByIdService
    const participantsWithRecognizedHours = updatedActivityWithRelations.participants.map(p => {
      let minuteValue = 0;

      // Logika je ista kao u getActivityByIdService, ali koristi `updatedActivityWithRelations`
      if (p.manual_hours !== null && p.manual_hours !== undefined) {
        minuteValue = Math.round(p.manual_hours * 60);
      } else if (updatedActivityWithRelations.manual_hours !== null && updatedActivityWithRelations.manual_hours !== undefined && updatedActivityWithRelations.manual_hours > 0) {
        minuteValue = Math.round(updatedActivityWithRelations.manual_hours * 60);
      } else if (updatedActivityWithRelations.actual_start_time && updatedActivityWithRelations.actual_end_time) {
        const minutes = differenceInMinutes(
          new Date(updatedActivityWithRelations.actual_end_time),
          new Date(updatedActivityWithRelations.actual_start_time)
        );
        minuteValue = minutes > 0 ? minutes : 0;
      }

      const finalRecognitionPercentage = p.recognition_override ?? updatedActivityWithRelations.recognition_percentage ?? 100;
      const recognizedMinutes = Math.round(minuteValue * (finalRecognitionPercentage / 100));
      const recognizedHours = recognizedMinutes / 60;

      return {
        ...p,
        recognized_hours: recognizedHours,
      };
    });

    return {
      ...updatedActivityWithRelations,
      participants: participantsWithRecognizedHours,
    };
  });
};

export const cancelActivityService = async (req: Request, activity_id: number, cancellation_reason: string) => {
  const organizationId = getOrganizationId(req);
  return prisma.$transaction(async (tx: TransactionClient) => {
    const activity = await tx.activity.findUnique({
      where: { 
        activity_id,
        organization_id: organizationId
      },
      include: { participants: true },
    });

    if (!activity) {
      throw new NotFoundError('Aktivnost nije pronađena.');
    }

    const participantIds = activity.participants.map(p => p.member_id);

    const cancelledActivity = await tx.activity.update({
      where: { activity_id: activity_id },
      data: {
        status: 'CANCELLED',
        cancellation_reason,
      },
    });

    const year = new Date(cancelledActivity.start_date).getFullYear();
    for (const memberId of participantIds) {
      await updateMemberTotalHours(memberId, tx);
      await updateMemberActivityHours(memberId, tx);
      await updateAnnualStatistics(memberId, year, tx);
    }

    return cancelledActivity;
  });
};

export const deleteActivityService = async (req: Request, activity_id: number) => {
  const organizationId = getOrganizationId(req);
  const activity = await getActivityByIdService(req, activity_id); // Prvo provjeravamo postoji li aktivnost
  
  // Zapamti sudionike prije brisanja
  const participantIds = activity.participants.map(p => p.member.member_id);
  
  // Koristi transakciju za brisanje aktivnosti i ažuriranje ukupnih sati sudionika
  return prisma.$transaction(async (tx: TransactionClient) => {
    // Izbriši aktivnost unutar transakcije
    const result = await activityRepository.deleteActivity(organizationId, activity_id, tx);
    
    // Ažuriraj sate i godišnju statistiku za sve sudionike koji su bili dio izbrisane aktivnosti unutar transakcije
    for (const memberId of participantIds) {
      await updateMemberTotalHours(memberId, tx);
      await updateMemberActivityHours(memberId, tx);
      if (activity.start_date) {
        const year = new Date(activity.start_date).getFullYear();
        await updateAnnualStatistics(memberId, year, tx);
      }
      // Očisti sve prazne godišnje statistike za člana
      await cleanupEmptyAnnualStatistics(memberId, tx);
    }
    
    return result;
  });
};

export const leaveActivityService = async (req: Request, activity_id: number, member_id: number) => {
  const organizationId = getOrganizationId(req);
  return prisma.$transaction(async (tx) => {
    const activity = await tx.activity.findUnique({ 
      where: { 
        activity_id,
        organization_id: organizationId
      } 
    });
    if (!activity) {
      throw new NotFoundError('Aktivnost nije pronađena.');
    }

    const participation = await tx.activityParticipation.findUnique({
      where: {
        activity_id_member_id: { activity_id, member_id },
      },
    });

    if (!participation) {
      throw new NotFoundError('Niste sudionik ove aktivnosti.');
    }

    // Ne možete napustiti aktivnost koja je završena ili otkazana
    if (activity.status === 'COMPLETED' || activity.status === 'CANCELLED') {
        throw new ConflictError('Ne možete napustiti aktivnost koja je završena ili otkazana.');
    }

    await activityRepository.removeParticipant(organizationId, activity_id, member_id, tx);

    await updateMemberTotalHours(member_id, tx);
    await updateMemberActivityHours(member_id, tx);

    if (activity.start_date) {
      const year = new Date(activity.start_date).getFullYear();
      await updateAnnualStatistics(member_id, year, tx);
    }

    return { message: 'Uspješno ste napustili aktivnost.' };
  });
};

// --- Sudionici (Participants) --- //

export const addParticipantService = async (req: Request, activity_id: number, member_id: number) => {
  const organizationId = getOrganizationId(req);
  // 1. Dohvati aktivnost s detaljima o tipu
  const activity = await activityRepository.findActivityById(organizationId, activity_id);
  if (!activity) {
    throw new NotFoundError('Aktivnost nije pronađena.');
  }

  // 2. Provjeri da li je član već prijavljen
  const existingParticipation = await activityRepository.findParticipation(organizationId, activity_id, member_id);
  if (existingParticipation) {
    throw new ConflictError('Član je već prijavljen na ovu aktivnost.');
  }

  // 3. Odredi postotak priznavanja na temelju tipa aktivnosti
  // Ako je tip 'TRIP', član je 'Izletnik' i dobiva 10%. Inače 100%.
    const recognitionValue = activity.activity_type.key === 'izleti' ? 10 : 100;

  // 4. Koristi transakciju za dodavanje sudionika i ažuriranje ukupnih sati
  return prisma.$transaction(async (tx: TransactionClient) => {
    // Dodaj sudionika s odgovarajućim postotkom priznavanja
    const newParticipation = await activityRepository.addParticipant(
      organizationId,
      activity_id,
      member_id,
      recognitionValue,
      tx
    );

    // Ako aktivnost ima stvarna vremena, ažuriramo ih i za novog sudionika
    if (activity.actual_start_time || activity.actual_end_time) {
      await tx.activityParticipation.update({
        where: {
          participation_id: newParticipation.participation_id,
        },
        data: {
          start_time: activity.actual_start_time ? new Date(activity.actual_start_time) : null,
          end_time: activity.actual_end_time ? new Date(activity.actual_end_time) : null,
        },
      });
    }

    // Ažuriraj ukupne sate za člana
    await updateMemberTotalHours(member_id, tx);
    await updateMemberActivityHours(member_id, tx);

    return newParticipation;
  });
};

export const removeParticipantFromActivityService = async (req: Request, activity_id: number, member_id: number) => {
  const organizationId = getOrganizationId(req);
  
  // Koristi transakciju za uklanjanje sudionika i ažuriranje ukupnih sati
  return prisma.$transaction(async (tx: TransactionClient) => {
    // Dohvati aktivnost prije uklanjanja sudionika kako bismo znali godinu
    const activity = await activityRepository.findActivityByIdSimple(organizationId, activity_id);
    if (!activity) {
      throw new NotFoundError('Aktivnost nije pronađena.');
    }

    await activityRepository.removeParticipant(organizationId, activity_id, member_id, tx);
    await updateMemberTotalHours(member_id, tx);
    await updateMemberActivityHours(member_id, tx);
    if (activity.start_date) {
      const year = new Date(activity.start_date).getFullYear();
      await updateAnnualStatistics(member_id, year, tx);
    }
    
    return;
  });
};

export const updateParticipationService = async (
  req: Request,
  participation_id: number,
  data: Prisma.ActivityParticipationUncheckedUpdateInput & { manual_hours_delta?: number }
) => {
  const organizationId = getOrganizationId(req);
  // Ovdje se može dodati provjera da li zapis o sudjelovanju postoji
  const { member_id, start_time, end_time, participant_role, manual_hours_delta, ...restUpdateData } = data;
  
  // Prvo dohvatimo zapis o sudjelovanju da bismo dobili validan member_id
  const participation = await prisma.activityParticipation.findUnique({
    where: { participation_id }
  });
  
  if (!participation) {
    throw new NotFoundError('Zapis o sudjelovanju nije pronađen.');
  }

  // Koristi member_id iz zapisa ako nije eksplicitno proslijeđen
  const memberId = typeof member_id === 'number' ? member_id : participation.member_id;
  
  // Pretvaranje start_time i end_time u Date objekte ako su prisutni
  
  
  const processedUpdateData: Prisma.ActivityParticipationUncheckedUpdateInput = {
    ...restUpdateData,
  };

  // RUKOVANJE S DELTA VRIJEDNOSTIMA
  if (manual_hours_delta !== undefined && manual_hours_delta !== null) {
    // Ako je poslan delta, koristimo Prisma `increment` operaciju
    processedUpdateData.manual_hours = {
      increment: manual_hours_delta,
    };
  } else if (data.manual_hours !== undefined) {
    // Ako je poslana apsolutna vrijednost, postavi je
    processedUpdateData.manual_hours = data.manual_hours;
  }
  
  // Ako je recognition_override eksplicitno proslijeđen, ažuriramo ga; inače ga ne diramo (čuvamo postojeće stanje)
  if (data.recognition_override !== undefined) {
    processedUpdateData.recognition_override = Number(data.recognition_override);
  }
  
  // Ako je participant_role eksplicitno proslijeđen, ažuriramo ga
  if (participant_role !== undefined) {
    processedUpdateData.participant_role = participant_role;
  }
  
  // Eksplicitno pretvaranje u Date objekt za start_time ako postoji
  if (start_time !== undefined) {
    // Provjeri tip start_time
    if (start_time === null) {
      processedUpdateData.start_time = null;
    } else if (typeof start_time === 'object' && start_time !== null && 'set' in start_time) {
      // Ovo je NullableDateTimeFieldUpdateOperationsInput
      if (start_time.set === null) {
        processedUpdateData.start_time = null;
      } else if (start_time.set !== undefined) {
        processedUpdateData.start_time = new Date(start_time.set);
      }
    } else if (start_time instanceof Date || typeof start_time === 'string' || typeof start_time === 'number') {
      processedUpdateData.start_time = new Date(start_time);
    } else {
      // Ako ne možemo odrediti tip, ostavimo kakvo je
      processedUpdateData.start_time = start_time;
    }
  }
  
  // Eksplicitno pretvaranje u Date objekt za end_time ako postoji
  if (end_time !== undefined) {
    // Provjeri tip end_time
    if (end_time === null) {
      processedUpdateData.end_time = null;
    } else if (typeof end_time === 'object' && end_time !== null && 'set' in end_time) {
      // Ovo je NullableDateTimeFieldUpdateOperationsInput
      if (end_time.set === null) {
        processedUpdateData.end_time = null;
      } else if (end_time.set !== undefined) {
        processedUpdateData.end_time = new Date(end_time.set);
      }
    } else if (end_time instanceof Date || typeof end_time === 'string' || typeof end_time === 'number') {
      processedUpdateData.end_time = new Date(end_time);
    } else {
      // Ako ne možemo odrediti tip, ostavimo kakvo je
      processedUpdateData.end_time = end_time;
    }
  }
  
  // Koristi transakciju za ažuriranje sudjelovanja i ukupnih sati člana
  return prisma.$transaction(async (tx: TransactionClient) => {
    await activityRepository.updateParticipation(organizationId, participation_id, processedUpdateData, tx);
    await updateMemberTotalHours(memberId, tx);
    await updateMemberActivityHours(memberId, tx);
    
    // Dohvati ažurirano sudjelovanje s podacima o aktivnosti
    const updatedParticipationWithActivity = await (tx as PrismaClient).activityParticipation.findUnique({
      where: { participation_id },
      include: { activity: true },
    });

    if (!updatedParticipationWithActivity) {
      throw new NotFoundError('Participation record not found after update.');
    }

    // Nakon ažuriranja, ponovno izračunaj ukupne sate i godišnju statistiku za tog člana
    await updateMemberTotalHours(memberId, tx);
    await updateMemberActivityHours(memberId, tx);
    if (updatedParticipationWithActivity.activity.start_date) {
      const year = new Date(updatedParticipationWithActivity.activity.start_date).getFullYear();
      await updateAnnualStatistics(memberId, year, tx);
    }

    return updatedParticipationWithActivity;
  });
};
