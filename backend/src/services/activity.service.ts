import { Prisma } from '@prisma/client';
import activityRepository from '../repositories/activity.repository.js';
import memberRepository from '../repositories/member.repository.js';
import { ActivityError } from '../shared/types/index.js';
import prisma from '../utils/prisma.js';

const activityService = {
  async getAllActivities() {
    return activityRepository.getAllActivities();
  },

  async getActivityById(id: string) {
    const activity = await activityRepository.getActivityById(id);
    if (!activity) {
      throw new ActivityError('Activity not found', 'NOT_FOUND');
    }
    return activity;
  },

  async getActivitiesByTypeId(typeId: number) {
    return activityRepository.getActivitiesByTypeId(typeId);
  },

  async createActivity(data: Prisma.ActivityUncheckedCreateInput) {
    if (new Date(data.end_date) < new Date(data.start_date)) {
      throw new ActivityError('End date cannot be before start date', 'VALIDATION_ERROR');
    }
    return activityRepository.createActivity(data);
  },

  async updateActivity(id: string, data: Prisma.ActivityUncheckedUpdateInput) {
    const activity = await activityRepository.getActivityById(id);
    if (!activity) {
      throw new ActivityError('Activity not found', 'NOT_FOUND');
    }
    if (data.start_date && data.end_date && new Date(data.end_date as Date) < new Date(data.start_date as Date)) {
      throw new ActivityError('End date cannot be before start date', 'VALIDATION_ERROR');
    }
    return activityRepository.updateActivity(id, data);
  },

  async deleteActivity(id: string) {
    const activity = await activityRepository.getActivityById(id);
    if (!activity) {
      throw new ActivityError('Activity not found', 'NOT_FOUND');
    }
    return activityRepository.deleteActivity(id);
  },

  async addMemberToActivity(activityId: string, memberId: number, hoursSpent: number) {
    return prisma.$transaction(async tx => {
      const activity = await tx.activity.findUnique({ where: { activity_id: parseInt(activityId, 10) } });
      if (!activity) {
        throw new ActivityError('Activity not found', 'NOT_FOUND');
      }

      const member = await memberRepository.findById(memberId);
      if (!member) {
        throw new ActivityError('Member not found', 'NOT_FOUND');
      }

      const existingParticipation = await activityRepository.findParticipant(activityId, memberId);
      if (existingParticipation) {
        throw new ActivityError('Member already in activity', 'VALIDATION_ERROR');
      }

      const participantsCount = await tx.activityParticipant.count({ where: { activity_id: parseInt(activityId, 10) } });
      if (activity.max_participants && participantsCount >= activity.max_participants) {
        throw new ActivityError('Activity has reached its maximum number of participants', 'MAX_PARTICIPANTS');
      }

      await memberRepository.updateWorkHours(memberId, hoursSpent, tx as any);

      return activityRepository.addParticipant(activityId, memberId, hoursSpent);
    });
  },

  async removeMemberFromActivity(activityId: string, memberId: number) {
    return prisma.$transaction(async tx => {
      const participation = await activityRepository.findParticipant(activityId, memberId);
      if (!participation) {
        throw new ActivityError('Member not in activity', 'NOT_FOUND');
      }

      await memberRepository.updateWorkHours(memberId, -participation.hours_spent.toNumber(), tx as any);

      return activityRepository.removeParticipant(activityId, memberId);
    });
  },

  async getMemberActivities(memberId: number) {
    return activityRepository.getMemberActivities(memberId);
  },

  async getAllActivityTypes() {
    return activityRepository.getAllActivityTypes();
  },

  async getActivityTypeById(typeId: number) {
    return activityRepository.getActivityTypeById(typeId);
  },
};

export default activityService;