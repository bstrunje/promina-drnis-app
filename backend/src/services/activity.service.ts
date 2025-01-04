import { PoolClient } from 'pg';
import db from '../utils/db.js';
import { 
    Activity, 
    ActivityCreateInput, 
    ActivityParticipant, 
    ActivityError,
    ActivityUpdateData,
    ActivityMember
} from '../../../frontend/shared/types/activity';
import activityRepository from '../repositories/activity.repository.js';


const activityService = {
    async getActivityById(id: string | number): Promise<Activity> {
        try {
            const numericId = typeof id === 'string' ? parseInt(id) : id;
            const activity = await activityRepository.findById(numericId);
            if (!activity) {
                throw new ActivityError('Activity not found', 'NOT_FOUND');
            }
            return activity as Activity;
        } catch (error) {
            if (error instanceof ActivityError) {
                throw error;
            }
            throw new ActivityError(
                `Error fetching activity: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'FETCH_ERROR'
            );
        }
    },   
    
    async getAllActivities(): Promise<Activity[]> {
        try {
            const activities = await activityRepository.findAll();
            return activities;
        } catch (error) {
          throw new ActivityError(
            `Error fetching activities: ${error instanceof Error ? error.message : 'Unknown error'}`,
            'FETCH_ALL_ERROR'
          );
        }
    },



    async createActivity(activityData: ActivityCreateInput): Promise<Activity> {
        try {
            if (!activityData.title) {
                throw new ActivityError('Activity title is required', 'VALIDATION_ERROR');
            }
            
            if (!activityData.start_date || !activityData.end_date) {
                throw new ActivityError('Start and end dates are required', 'VALIDATION_ERROR');
            }

            const startDate = new Date(activityData.start_date);
            const endDate = new Date(activityData.end_date);
            
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                throw new ActivityError('Invalid date format', 'VALIDATION_ERROR');
            }

            if (startDate > endDate) {
                throw new ActivityError('Start date cannot be after end date', 'VALIDATION_ERROR');
            }

            const newActivity = await activityRepository.create(activityData as any);
return {
    ...newActivity,
    participants: []  // New activity won't have participants yet
};
        } catch (error) {
            if (error instanceof ActivityError) {
                throw error;
            }
            throw new ActivityError(
                `Error creating activity: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'CREATE_ERROR'
            );
        }
    },

    async addMemberToActivity(
        activityId: string | number, 
        memberId: number,
        hoursSpent: number
    ): Promise<ActivityParticipant> {
        try {
            if (hoursSpent < 0) {
                throw new ActivityError('Hours spent cannot be negative', 'VALIDATION_ERROR');
            }
    
            const numericActivityId = typeof activityId === 'string' ? parseInt(activityId) : activityId;
            const activity = await activityRepository.findById(numericActivityId);
            if (!activity) {
                throw new ActivityError('Activity not found', 'NOT_FOUND');
            }
    
            if (activity.max_participants) {
                const currentParticipants = await activityRepository.getParticipantsCount(numericActivityId);
                if (currentParticipants >= activity.max_participants) {
                    throw new ActivityError('Activity has reached maximum participants', 'MAX_PARTICIPANTS');
                }
            }
    
            return await db.transaction(async (client: PoolClient) => {
                const member = await client.query(`
                    SELECT first_name, last_name 
                    FROM members 
                    WHERE member_id = $1
                `, [memberId]);

                const participation = await activityRepository.addParticipant(numericActivityId, memberId, hoursSpent);
                
                await client.query(`
                    UPDATE members 
                    SET total_hours = COALESCE(total_hours, 0) + $1 
                    WHERE member_id = $2
                `, [hoursSpent, memberId]);
    
                return {
                    member_id: participation.member_id,
                    first_name: member.rows[0].first_name,
                    last_name: member.rows[0].last_name,
                    hours_spent: participation.hours_spent,
                    verified: false
                } as ActivityParticipant;
            });
    
        } catch (error) {
            if (error instanceof ActivityError) {
                throw error;
            }
            throw new ActivityError(
                `Error adding member to activity: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'ADD_MEMBER_ERROR'
            );
        }
    },

    async removeMemberFromActivity(activityId: string | number, memberId: number): Promise<boolean> {
        try {
            const numericActivityId = typeof activityId === 'string' ? parseInt(activityId) : activityId;
            const activity = await activityRepository.findById(numericActivityId);
            if (!activity) {
                throw new ActivityError('Activity not found', 'NOT_FOUND');
            }
    
            const participation = await activityRepository.getParticipation(numericActivityId, memberId);
            if (!participation) {
                throw new ActivityError('Member not found in activity', 'NOT_FOUND');
            }
    
            return await db.transaction(async (client: PoolClient) => {
                await client.query(`
                    UPDATE members 
                    SET total_hours = COALESCE(total_hours, 0) - $1 
                    WHERE member_id = $2
                `, [participation.hours_spent, memberId]);
    
                return await activityRepository.removeParticipant(numericActivityId, memberId);
            });
        } catch (error) {
            if (error instanceof ActivityError) {
                throw error;
            }
            throw new ActivityError(
                `Error removing member from activity: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'REMOVE_MEMBER_ERROR'
            );
        }
    },

    async getMemberActivities(memberId: number): Promise<{
        activity_id: number;
        title: string;
        date: string;
        hours_spent: number;
    }[]> {
        const result = await db.query(`
            SELECT 
                a.activity_id,
                a.title,
                a.start_date as date,
                ap.hours_spent
            FROM activities a
            JOIN activity_participants ap ON a.activity_id = ap.activity_id
            WHERE ap.member_id = $1
            ORDER BY a.start_date DESC
        `, [memberId]);
        return result.rows;
    },

    async updateActivity(id: string | number, updateData: ActivityUpdateData): Promise<Activity> {
        try {
            const numericId = typeof id === 'string' ? parseInt(id) : id;
            const activity = await activityRepository.findById(numericId);
            if (!activity) {
                throw new ActivityError('Activity not found', 'NOT_FOUND');
            }

            if (updateData.start_date || updateData.end_date) {
                const startDate = new Date(updateData.start_date || activity.start_date);
                const endDate = new Date(updateData.end_date || activity.end_date);
                
                if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                    throw new ActivityError('Invalid date format', 'VALIDATION_ERROR');
                }

                if (startDate > endDate) {
                    throw new ActivityError('Start date cannot be after end date', 'VALIDATION_ERROR');
                }
            }

            const updatedActivity = await activityRepository.update(numericId, updateData);
if (!updatedActivity) {
    throw new ActivityError('Failed to update activity', 'UPDATE_ERROR');
}
return {
    ...updatedActivity,
    participants: updatedActivity.participants?.map(p => ({
        ...p,
        verified: p.verified ?? false
    }))
};
        } catch (error) {
            if (error instanceof ActivityError) {
                throw error;
            }
            throw new ActivityError(
                `Error updating activity: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'UPDATE_ERROR'
            );
        }
    },

    async deleteActivity(id: string | number): Promise<void> {
        try {
            const numericId = typeof id === 'string' ? parseInt(id) : id;
            const activity = await activityRepository.findById(numericId);
            if (!activity) {
                throw new ActivityError('Activity not found', 'NOT_FOUND');
            }

            await activityRepository.delete(numericId);
        } catch (error) {
            if (error instanceof ActivityError) {
                throw error;
            }
            throw new ActivityError(
                `Error deleting activity: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'DELETE_ERROR'
            );
        }
    }
};

export default activityService;