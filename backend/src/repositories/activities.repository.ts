import prisma from '../utils/prisma.js';
import { Prisma, PrismaClient } from '@prisma/client';

// Tip za Prisma transakcijski klijent
type TransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

// --- Tipovi Aktivnosti ---

export const findAllActivityTypes = async () => {
  return prisma.activityType.findMany({
    orderBy: { name: 'asc' },
  });
};

// --- Aktivnosti ---

export const findAllActivities = async () => {
  return prisma.activity.findMany({
    include: {
      activity_type: true,
      organizer: {
        select: { member_id: true, first_name: true, last_name: true },
      },
      _count: {
        select: { participants: true },
      },
    },
    orderBy: { start_date: 'desc' },
  });
};

/**
 * Dohvaća sve aktivnosti s detaljima sudionika (za izračun sati)
 * Ova funkcija je specijalizirana verzija findAllActivities koja uključuje i podatke o sudionicima
 */
export const findAllActivitiesWithParticipants = async () => {
  return prisma.activity.findMany({
    include: {
      activity_type: true,
      organizer: {
        select: { member_id: true, first_name: true, last_name: true },
      },
      participants: {
        include: {
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
    orderBy: { start_date: 'desc' },
  });
};

export const findActivityById = async (activity_id: number) => {
  return prisma.activity.findUnique({
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
};

export const findActivitiesByTypeId = async (type_id: number) => {
  return prisma.activity.findMany({ where: { type_id } });
};

export const findActivitiesByParticipantId = async (member_id: number) => {
  return prisma.activityParticipation.findMany({
    where: {
      member_id: member_id,
    },
    include: {
      activity: { // Uključujemo podatke o samoj aktivnosti
        include: {
          activity_type: true, // I tip aktivnosti
        }
      }
    },
    orderBy: {
      activity: {
        start_date: 'desc'
      }
    }
  });
};

export const findParticipationsByMemberIdAndYear = async (member_id: number, year: number) => {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

  return prisma.activityParticipation.findMany({
    where: {
      member_id: member_id,
      activity: {
        start_date: {
          gte: startDate,
          lte: endDate,
        },
      },
    },
    include: {
      activity: {
        include: {
          activity_type: true,
        },
      },
    },
    orderBy: {
      activity: {
        start_date: 'desc',
      },
    },
  });
};

export const findActivityByIdSimple = async (activity_id: number) => {
  return prisma.activity.findUnique({ where: { activity_id } });
};

export const findActivitiesByMemberId = async (member_id: number) => {
  return prisma.activity.findMany({
    where: {
      organizer: {
        member_id: member_id,
      },
    },
    include: {
      activity_type: true,
      organizer: {
        select: { member_id: true, first_name: true, last_name: true },
      },
      _count: {
        select: { participants: true },
      },
    },
    orderBy: { start_date: 'desc' },
  });
};

export const createActivity = async (data: Prisma.ActivityUncheckedCreateInput, prismaClient: TransactionClient = prisma) => {
  return prismaClient.activity.create({ data });
};

export const updateActivity = async (activity_id: number, data: Prisma.ActivityUpdateInput, prismaClient: TransactionClient = prisma) => {
  return prismaClient.activity.update({
    where: { activity_id },
    data,
  });
};

export const deleteActivity = async (activity_id: number, prismaClient: TransactionClient = prisma) => {
  return prismaClient.activity.delete({ where: { activity_id } });
};

// --- Sudionici (Participants) --- //

export const findParticipation = async (activity_id: number, member_id: number) => {
  return prisma.activityParticipation.findUnique({
    where: {
      activity_id_member_id: {
        activity_id,
        member_id,
      },
    },
  });
};

export const addParticipant = async (activity_id: number, member_id: number, prismaClient: TransactionClient = prisma) => {
  return prismaClient.activityParticipation.create({
    data: {
      activity_id,
      member_id,
    },
  });
};

export const removeParticipant = async (activity_id: number, member_id: number, prismaClient: TransactionClient = prisma) => {
  return prismaClient.activityParticipation.delete({
    where: {
      activity_id_member_id: {
        activity_id,
        member_id,
      },
    },
  });
};

export const updateParticipation = async (
  participation_id: number,
  data: Prisma.ActivityParticipationUpdateInput,
  prismaClient: TransactionClient = prisma
) => {
  return prismaClient.activityParticipation.update({
    where: { participation_id },
    data,
  });
};
