import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma.js';

const activityWithDetailsInclude = {
  participants: {
    include: {
      member: {
        select: {
          member_id: true,
          first_name: true,
          last_name: true,
        },
      },
    },
  },
  creator: {
    select: {
      first_name: true,
      last_name: true,
    },
  },
} satisfies Prisma.ActivityInclude;

type ActivityWithDetails = Prisma.ActivityGetPayload<{
  include: typeof activityWithDetailsInclude;
}>;

// Helper to transform Prisma result
const transformActivity = (activity: ActivityWithDetails | null) => {
  if (!activity) {
    return null;
  }
  return {
    ...activity,
    participants: activity.participants.map(p => ({
      member_id: p.member.member_id,
      first_name: p.member.first_name,
      last_name: p.member.last_name,
      hours_spent: p.hours_spent,
      verified: !!p.verified_at,
    })),
    organizer_name: activity.creator
      ? `${activity.creator.first_name} ${activity.creator.last_name}`
      : 'Nepoznato',
  };
};

const activityRepository = {
  async getAllActivities() {
    const activities = await prisma.activity.findMany({
      include: activityWithDetailsInclude,
      orderBy: { start_date: 'desc' },
    });
    return activities.map(transformActivity);
  },

  async getActivityById(id: string) {
    const activity = await prisma.activity.findUnique({
      where: { activity_id: parseInt(id, 10) },
      include: activityWithDetailsInclude,
    });
    return transformActivity(activity);
  },

  async createActivity(data: Prisma.ActivityUncheckedCreateInput) {
    return prisma.activity.create({ data });
  },

  async updateActivity(id: string, data: Prisma.ActivityUncheckedUpdateInput) {
    return prisma.activity.update({
      where: { activity_id: parseInt(id, 10) },
      data,
    });
  },

  async deleteActivity(id: string) {
    const result = await prisma.$transaction([
      prisma.activityParticipant.deleteMany({ where: { activity_id: parseInt(id, 10) } }),
      prisma.activity.delete({ where: { activity_id: parseInt(id, 10) } }),
    ]);
    return !!result;
  },

  async findParticipant(activityId: string, memberId: number) {
    return prisma.activityParticipant.findFirst({
      where: {
        activity_id: parseInt(activityId, 10),
        member_id: memberId,
      },
    });
  },

  async addParticipant(activityId: string, memberId: number, hoursSpent: number) {
    return prisma.activityParticipant.create({
      data: {
        activity_id: parseInt(activityId, 10),
        member_id: memberId,
        hours_spent: hoursSpent,
      },
    });
  },

  async removeParticipant(activityId: string, memberId: number) {
    return prisma.activityParticipant.deleteMany({
      where: {
        activity_id: parseInt(activityId, 10),
        member_id: memberId,
      },
    });
  },

  async getParticipantsCount(activityId: string) {
    return prisma.activityParticipant.count({
      where: { activity_id: parseInt(activityId, 10) },
    });
  },

  async getParticipation(activityId: string, memberId: number) {
    return prisma.activityParticipant.findFirst({
      where: {
        activity_id: parseInt(activityId, 10),
        member_id: memberId,
      },
    });
  },

  async getMemberActivities(memberId: number) {
    const participations = await prisma.activityParticipant.findMany({
      where: { member_id: memberId },
      include: {
        activity: true,
      },
      orderBy: {
        activity: {
          start_date: 'desc',
        },
      },
    });

    return participations
      .map(p => {
        if (!p.activity) return null;
        return {
          ...p.activity,
          hours_spent: p.hours_spent,
          verified: !!p.verified_at,
        };
      })
      .filter(Boolean);
  },

  async getAllActivityTypes() {
    return prisma.activityType.findMany();
  },

  async getActivityTypeById(typeId: number) {
    return prisma.activityType.findUnique({
      where: {
        type_id: typeId,
      },
    });
  },

  async getActivitiesByTypeId(typeId: number) {
    const activities = await prisma.activity.findMany({
      where: {
        activity_type_id: typeId,
      },
      include: activityWithDetailsInclude,
      orderBy: {
        start_date: 'desc',
      },
    });
    return activities.map(transformActivity);
  },

  async addParticipantToActivity(activityId: number, memberId: number) {
    return prisma.activityParticipant.create({
      data: {
        activity_id: activityId,
        member_id: memberId,
        hours_spent: 0,
      },
    });
  },
};

export default activityRepository;