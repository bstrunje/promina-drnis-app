import prisma from '../utils/prisma.js';
import { Prisma, PrismaClient, ActivityStatus } from '@prisma/client';

// Tip za Prisma transakcijski klijent
type TransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

// --- Tipovi Aktivnosti ---

export const findAllActivityTypes = async (organizationId: number) => {
  return prisma.activityType.findMany({
    where: { organization_id: organizationId },
    orderBy: { name: 'asc' },
  });
};

export const updateActivityTypeVisibility = async (
  typeId: number,
  organizationId: number,
  isVisible: boolean
) => {
  return prisma.activityType.update({
    where: {
      type_id: typeId,
      organization_id: organizationId,
    },
    data: { is_visible: isVisible },
  });
};

export const updateActivityTypeCustomFields = async (
  typeId: number,
  organizationId: number,
  customLabel?: string | null,
  customDescription?: string | null,
  isVisible?: boolean
) => {
  return prisma.activityType.update({
    where: {
      type_id: typeId,
      organization_id: organizationId,
    },
    data: { 
      custom_label: customLabel,
      custom_description: customDescription,
      is_visible: isVisible,
    },
  });
};

// --- Aktivnosti ---

export const findAllActivities = async (organizationId: number) => {
  return prisma.activity.findMany({
    where: { organization_id: organizationId },
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
export const findActivitiesByYearWithParticipants = async (organizationId: number, year: number) => {
  const startDateFilter = {
    gte: new Date(`${year}-01-01T00:00:00.000Z`),
    lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
  };

  const whereClause: Prisma.ActivityWhereInput = {
    organization_id: organizationId,
    start_date: startDateFilter,
  };

  return prisma.activity.findMany({
    where: whereClause,
    include: {
      activity_type: true,
      organizer: {
        select: { member_id: true, first_name: true, last_name: true },
      },
      participants: {
        select: {
          participation_id: true,
          member_id: true,
          start_time: true,
          end_time: true,
          manual_hours: true,
          recognition_override: true,
          participant_role: true,
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

export const findAllActivitiesWithParticipants = async (organizationId: number) => {
  return prisma.activity.findMany({
    where: { organization_id: organizationId },
    include: {
      activity_type: true,
      organizer: {
        select: { member_id: true, first_name: true, last_name: true },
      },
      participants: {
        select: {
          participation_id: true,
          member_id: true,
          start_time: true,
          end_time: true,
          manual_hours: true,
          recognition_override: true,
          participant_role: true,
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

export const findActivityById = async (organizationId: number, activity_id: number) => {
  return prisma.activity.findUnique({
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

export const getActivitiesByTypeId = (organizationId: number, type_id: number, year?: number) => {
  const whereClause: Prisma.ActivityWhereInput = { 
    organization_id: organizationId,
    type_id 
  } as Prisma.ActivityWhereInput;

  if (year) {
    const startDateFilter = {
      gte: new Date(`${year}-01-01T00:00:00.000Z`),
      lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
    };
    whereClause.start_date = startDateFilter;
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

export const findActivitiesByStatus = async (organizationId: number, status: ActivityStatus) => {
  return prisma.activity.findMany({
    where: { 
      organization_id: organizationId,
      status 
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
    orderBy: { start_date: 'asc' },
  });
};



export const findActivitiesByParticipantId = async (organizationId: number, member_id: number) => {
  return prisma.activityParticipation.findMany({
    where: {
      organization_id: organizationId,
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


export const findParticipationsByMemberIdAndYear = async (organizationId: number, member_id: number, year: number) => {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year + 1, 0, 1);

  return prisma.activityParticipation.findMany({
    where: {
      organization_id: organizationId,
      member_id: member_id,
      activity: {
        start_date: {
          gte: startDate,
          lt: endDate,
        },
      },
    },
    include: {
      activity: {
        include: {
          activity_type: true // Trebamo activity_type za provjeru je li IZLETI
        }
      }
    },
    orderBy: {
      activity: {
        start_date: 'desc',
      },
    },
  });
};

export const findActivityByIdSimple = async (organizationId: number, activity_id: number) => {
  return prisma.activity.findUnique({ 
    where: { 
      activity_id,
      organization_id: organizationId
    } 
  });
};

export const findActivitiesByMemberId = async (organizationId: number, member_id: number) => {
  return prisma.activity.findMany({
    where: {
      organization_id: organizationId,
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

export const updateActivity = async (organizationId: number, activity_id: number, data: Prisma.ActivityUpdateInput, prismaClient: TransactionClient = prisma) => {
  return prismaClient.activity.update({
    where: { 
      activity_id,
      organization_id: organizationId
    },
    data,
  });
};

export const deleteActivity = async (organizationId: number, activity_id: number, prismaClient: TransactionClient = prisma) => {
  return prismaClient.activity.delete({ 
    where: { 
      activity_id,
      organization_id: organizationId
    } 
  });
};

// --- Sudionici (Participants) --- //

export const findParticipation = async (organizationId: number, activity_id: number, member_id: number) => {
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
  organizationId: number,
  activity_id: number,
  member_id: number,
  recognition_override?: number,
  prismaClient: TransactionClient = prisma
) => {
  return prismaClient.activityParticipation.create({
    data: {
      organization_id: organizationId,
      activity_id,
      member_id,
      recognition_override,
    },
  });
};

export const removeParticipant = async (organizationId: number, activity_id: number, member_id: number, prismaClient: TransactionClient = prisma) => {
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
  organizationId: number,
  participation_id: number,
  data: Prisma.ActivityParticipationUpdateInput,
  prismaClient: TransactionClient = prisma
) => {
  return prismaClient.activityParticipation.update({
    where: { participation_id },
    data,
  });
};
