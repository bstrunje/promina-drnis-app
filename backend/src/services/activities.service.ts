import { ActivityStatus, Prisma, PrismaClient } from '@prisma/client';
import * as activityRepository from '../repositories/activities.repository.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import prisma from '../utils/prisma.js';
import { updateMemberTotalHours } from './member.service.js';

// Tip za Prisma transakcijski klijent
type TransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

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
  const { activity_type_id, participant_ids, recognition_percentage, manual_hours, ...rest } = data;

  if (!activity_type_id) {
    throw new Error('Activity type ID is required.');
  }

  // Određivanje statusa na temelju datuma
  const status = determineActivityStatus(rest.actual_start_time, rest.actual_end_time);

  // Koristimo recognition_percentage iz zahtjeva ako je dostupan, inače default 100
  const recognitionValue = recognition_percentage !== undefined ? recognition_percentage : 100;
  console.log('Recognition value being set:', recognitionValue); // Logging za debug

  const activityData: Prisma.ActivityUncheckedCreateInput = {
    ...rest,
    organizer_id,
    type_id: activity_type_id,
    status, // Postavljanje statusa
    participants: participant_ids && participant_ids.length > 0 ? {
      create: participant_ids.map((id: number) => ({
        member_id: id,
        // Automatsko popunjavanje vremena sudionika ili manual_hours ako je uneseno
        start_time: rest.actual_start_time ? new Date(rest.actual_start_time) : null,
        end_time: rest.actual_end_time ? new Date(rest.actual_end_time) : null,
        // Dodajemo manual_hours za sve sudionike ako je uneseno
        manual_hours: (manual_hours !== undefined && manual_hours !== null && Number(manual_hours) > 0) ? Number(manual_hours) : null,
        recognition_override: recognitionValue, // Koristimo vrijednost iz requesta
      })),
    } : undefined,
  };

  // Koristi transakciju za stvaranje aktivnosti i ažuriranje ukupnih sati sudionika
  return prisma.$transaction(async (tx: TransactionClient) => {
    const createdActivity = await activityRepository.createActivity(activityData, tx);
    
    // Ažuriranje ukupnih sati za sve sudionike koji su dodani unutar iste transakcije
    if (participant_ids && participant_ids.length > 0) {
      for (const memberId of participant_ids) {
        await updateMemberTotalHours(memberId, tx);
      }
    }

    return createdActivity;
  });
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

  const { participant_ids, manual_hours, ...activityData } = data;

  // Rješavanje konačnih vrijednosti za vremena kako bi se izbjegle greške u tipovima
  const finalStartTime = activityData.actual_start_time ?? existingActivity.actual_start_time;
  const finalEndTime = activityData.actual_end_time ?? existingActivity.actual_end_time;

  // Uklanjamo manual_hours iz activityData jer pripada ActivityParticipation, ne Activity
  const updatePayload: Prisma.ActivityUpdateInput = {
    ...activityData,
  };

  // Automatsko postavljanje statusa na temelju datuma ili manual_hours
  if (manual_hours !== undefined && manual_hours !== null && Number(manual_hours) > 0) {
    // Ako su uneseni ručni sati, aktivnost je već obavljena
    updatePayload.status = 'COMPLETED';
  } else {
    // Inače određujemo status na temelju datuma
    updatePayload.status = determineActivityStatus(finalStartTime, finalEndTime);
  }

  // Čuvamo IDs svih sudionika prije ažuriranja za kasnije ažuriranje njihovih total_hours
  const existingParticipants = existingActivity.participants.map(p => p.member.member_id);
  
  // Mapa za čuvanje postotka priznanja sati za svakog člana
  const memberRecognitionMap = new Map();
  existingActivity.participants.forEach(p => {
    memberRecognitionMap.set(p.member.member_id, p.recognition_override || 100);
  });
  
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
        start_time: finalStartTime ? new Date(finalStartTime) : null,
        end_time: finalEndTime ? new Date(finalEndTime) : null,
        // Dodajemo manual_hours za sve sudionike ako je uneseno
        manual_hours: (manual_hours !== undefined && manual_hours !== null && Number(manual_hours) > 0) ? Number(manual_hours) : null,
        // Ako je član već bio sudionik, zadrži njegov postotak, inače postavi 100%
        recognition_override: memberRecognitionMap.has(id) ? memberRecognitionMap.get(id) : 100,
      })),
    };
  }

  // Koristi transakciju za ažuriranje aktivnosti i ažuriranje ukupnih sati sudionika
  return prisma.$transaction(async (tx: TransactionClient) => {
    const updatedActivity = await activityRepository.updateActivity(activity_id, updatePayload, tx);

    // Ako nisu poslani novi sudionici, ali su se vremena ili ručni sati promijenili,
    // ažuriraj podatke za sve postojeće sudionike unutar transakcije
    const timesChanged = 'actual_start_time' in activityData || 'actual_end_time' in activityData;
    const hasManualHours = manual_hours !== undefined;
    if ((timesChanged || hasManualHours) && !(participant_ids && Array.isArray(participant_ids))) {
      await tx.activityParticipation.updateMany({
        where: { activity_id },
        data: {
          start_time: updatedActivity.actual_start_time ? new Date(updatedActivity.actual_start_time) : null,
          end_time: updatedActivity.actual_end_time ? new Date(updatedActivity.actual_end_time) : null,
          manual_hours: (hasManualHours && manual_hours !== null && Number(manual_hours) > 0) ? Number(manual_hours) : undefined, // Postavljamo manual_hours samo ako je stvarno > 0
        },
      });
      
      // Ažuriraj ukupne sate za sve postojeće sudionike unutar transakcije
      for (const memberId of existingParticipants) {
        await updateMemberTotalHours(memberId, tx);
      }
    } else if (participant_ids && Array.isArray(participant_ids)) {
      // Ažuriraj sate i za stare i za nove sudionike unutar transakcije
      const allParticipantIds = new Set([...existingParticipants, ...participant_ids]);
      for (const memberId of allParticipantIds) {
        await updateMemberTotalHours(memberId, tx);
      }
    }

    // Vrati ažuriranu aktivnost s potencijalno novim podacima
    return getActivityByIdService(activity_id);
  });
};

export const cancelActivityService = async (activity_id: number, cancellation_reason: string) => {
  // Prvo provjeravamo postoji li aktivnost
  const activity = await getActivityByIdService(activity_id);

  const updatePayload: Prisma.ActivityUpdateInput = {
    status: 'CANCELLED',
    cancellation_reason,
  };

  // Koristi transakciju za otkazivanje aktivnosti i ažuriranje ukupnih sati sudionika
  return prisma.$transaction(async (tx: TransactionClient) => {
    const cancelledActivity = await activityRepository.updateActivity(
      activity_id,
      { status: 'CANCELLED' },
      tx
    );
    
    // Ažuriraj sate za sve sudionike kad je aktivnost otkazana unutar transakcije
    for (const participant of activity.participants) {
      await updateMemberTotalHours(participant.member.member_id, tx);
    }

    return cancelledActivity;
  });
};

export const deleteActivityService = async (activity_id: number) => {
  const activity = await getActivityByIdService(activity_id); // Prvo provjeravamo postoji li aktivnost
  
  // Zapamti sudionike prije brisanja
  const participantIds = activity.participants.map(p => p.member.member_id);
  
  // Koristi transakciju za brisanje aktivnosti i ažuriranje ukupnih sati sudionika
  return prisma.$transaction(async (tx: TransactionClient) => {
    // Izbriši aktivnost unutar transakcije
    const result = await activityRepository.deleteActivity(activity_id, tx);
    
    // Ažuriraj sate za sve sudionike koji su bili dio izbrisane aktivnosti unutar transakcije
    for (const memberId of participantIds) {
      await updateMemberTotalHours(memberId, tx);
    }
    
    return result;
  });
};

// --- Sudionici (Participants) --- //

export const addParticipantToActivityService = async (activity_id: number, member_id: number) => {
  // Provjera postoji li aktivnost
  const activity = await getActivityByIdService(activity_id);

  // Provjera postoji li član već kao sudionik
  const existingParticipation = await activityRepository.findParticipation(activity_id, member_id);
  if (existingParticipation) {
    throw new ConflictError('Član je već prijavljen na ovu aktivnost.');
  }

  // Koristi transakciju za dodavanje sudionika i ažuriranje ukupnih sati
  return prisma.$transaction(async (tx: TransactionClient) => {
    // Dodaj sudionika
    await activityRepository.addParticipant(activity_id, member_id, tx);

    // Ako aktivnost ima stvarna vremena, ažuriramo ih i za sudionika
    if (activity.actual_start_time || activity.actual_end_time) {
      await tx.activityParticipation.update({
        where: {
          activity_id_member_id: {
            activity_id,
            member_id
          }
        },
        data: {
          start_time: activity.actual_start_time ? new Date(activity.actual_start_time) : null,
          end_time: activity.actual_end_time ? new Date(activity.actual_end_time) : null,
          recognition_override: 100, // Ako nije već postavljeno
        },
      });
    }
    
    // Ažuriraj ukupne sate za člana
    await updateMemberTotalHours(member_id, tx);
    
    return;
  });
};

export const removeParticipantFromActivityService = async (activity_id: number, member_id: number) => {
  const participation = await activityRepository.findParticipation(activity_id, member_id);
  if (!participation) {
    throw new NotFoundError('Član nije pronađen kao sudionik na ovoj aktivnosti.');
  }
  
  // Koristi transakciju za uklanjanje sudionika i ažuriranje ukupnih sati
  return prisma.$transaction(async (tx: TransactionClient) => {
    await activityRepository.removeParticipant(activity_id, member_id, tx);
    await updateMemberTotalHours(member_id, tx);
    
    return;
  });
};

export const updateParticipationService = async (
  participation_id: number,
  data: Prisma.ActivityParticipationUncheckedUpdateInput
) => {
  // DEBUG: Dodano logiranje za debugiranje start_time problema
  console.log('DEBUG: Primljeni payload za update participacije:', JSON.stringify(data, null, 2));
  console.log('DEBUG: Tip start_time:', typeof data.start_time, data.start_time);
  // Ovdje se može dodati provjera da li zapis o sudjelovanju postoji
  const { member_id, start_time, end_time, ...restUpdateData } = data;
  
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
  
  // DEBUG: Detaljno logiranje recognition_override
  console.log('DEBUG: restUpdateData:', restUpdateData);
  console.log('DEBUG: restUpdateData.recognition_override:', restUpdateData.recognition_override);
  console.log('DEBUG: Tip restUpdateData.recognition_override:', typeof restUpdateData.recognition_override);
  console.log('DEBUG: data.recognition_override:', data.recognition_override);
  console.log('DEBUG: Tip data.recognition_override:', typeof data.recognition_override);
  
  const processedUpdateData: any = {
    ...restUpdateData,
    // Postavi recognition_override na 100 ako nije definiran
    recognition_override: data.recognition_override === undefined ? 100 : Number(data.recognition_override)
  };
  
  // Eksplicitno pretvaranje u Date objekt za start_time ako postoji
  if (start_time !== undefined) {
    // Provjeri tip start_time
    if (start_time === null) {
      processedUpdateData.start_time = null;
    } else if (typeof start_time === 'object' && 'set' in start_time) {
      // Ovo je NullableDateTimeFieldUpdateOperationsInput
      if (start_time.set === null) {
        processedUpdateData.start_time = null;
      } else {
        processedUpdateData.start_time = new Date(start_time.set as any);
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
    } else if (typeof end_time === 'object' && 'set' in end_time) {
      // Ovo je NullableDateTimeFieldUpdateOperationsInput
      if (end_time.set === null) {
        processedUpdateData.end_time = null;
      } else {
        processedUpdateData.end_time = new Date(end_time.set as any);
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
    await activityRepository.updateParticipation(participation_id, processedUpdateData, tx);
    await updateMemberTotalHours(memberId, tx);
    
    return;
  });
};
