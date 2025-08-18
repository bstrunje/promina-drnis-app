import prisma from '../utils/prisma.js';
import { Prisma, PrismaClient, ActivityStatus } from '@prisma/client';

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
export const findActivitiesByYearWithParticipants = async (year: number) => {
  const whereClause: Prisma.ActivityWhereInput = {
    start_date: {
      gte: new Date(`${year}-01-01T00:00:00.000Z`),
      lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
    },
  };

  return prisma.activity.findMany({
    where: whereClause,
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
        orderBy: { participation_id: 'asc' },
      },
      _count: {
        select: { participants: true },
      },
    },
    orderBy: { start_date: 'desc' },
  });
};

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
        orderBy: { participation_id: 'asc' },
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
        orderBy: { participation_id: 'asc' },
      },
      _count: {
        select: { participants: true },
      },
    },
  });
};

export const getActivitiesByTypeId = (type_id: number, year?: number) => {
  const whereClause: Prisma.ActivityWhereInput = { type_id } as Prisma.ActivityWhereInput;

  if (year) {
    whereClause.start_date = {
      gte: new Date(`${year}-01-01T00:00:00.000Z`),
      lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
    };
  }

  return prisma.activity.findMany({
    where: whereClause,
    include: {
      activity_type: true,
      participants: {
        include: {
          member: true,
        },
        orderBy: { participation_id: 'asc' },
      },
    },
    orderBy: {
      start_date: 'desc',
    },
  });
};

export const findActivitiesByStatus = async (status: ActivityStatus) => {
  return prisma.activity.findMany({
    where: { status },
    include: {
      activity_type: true,
      organizer: {
        select: { member_id: true, first_name: true, last_name: true },
      },
      _count: {
        select: { participants: true },
      },
    },
    orderBy: { start_date: 'asc' },
  });
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
  const endDate = new Date(year + 1, 0, 1);

  return prisma.activityParticipation.findMany({
    where: {
      member_id: member_id,
      activity: {
        start_date: {
          gte: startDate,
          lt: endDate,
        },
      },
    },
    include: {
      activity: true, // Uključujemo cijeli objekt aktivnosti
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

export const addParticipant = async (
  activity_id: number,
  member_id: number,
  recognition_override?: number,
  prismaClient: TransactionClient = prisma
) => {
  return prismaClient.activityParticipation.create({
    data: {
      activity_id,
      member_id,
      recognition_override,
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
