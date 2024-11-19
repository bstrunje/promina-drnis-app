import { 
    Activity, 
    ActivityCreateInput, 
    ActivityMember, 
    ActivityError,
    ActivityUpdateData
} from 'promina-drnis-app-shared/types/activity';
import activityRepository from '../repositories/activity.repository.js';

const activityService = {
    async getActivityById(id: string | number): Promise<Activity> {
        try {
            const activity = await activityRepository.findById(id);
            if (!activity) {
                throw new ActivityError('Activity not found', 'NOT_FOUND');
            }
            return activity;
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
            return await activityRepository.findAll();
        } catch (error) {
          throw new ActivityError(
            `Error fetching activities: ${error instanceof Error ? error.message : 'Unknown error'}`,
            'FETCH_ALL_ERROR'
          );
        }
      },

    async createActivity(activityData: ActivityCreateInput): Promise<Activity> {
        try {
            // Validation
            if (!activityData.title) {
                throw new ActivityError('Activity title is required', 'VALIDATION_ERROR');
            }
            
            if (!activityData.start_date || !activityData.end_date) {
                throw new ActivityError('Start and end dates are required', 'VALIDATION_ERROR');
            }

            // Validate dates
            const startDate = new Date(activityData.start_date);
            const endDate = new Date(activityData.end_date);
            
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                throw new ActivityError('Invalid date format', 'VALIDATION_ERROR');
            }

            if (startDate > endDate) {
                throw new ActivityError('Start date cannot be after end date', 'VALIDATION_ERROR');
            }

            return await activityRepository.create(activityData as any); // Type assertion to match repository
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
        memberId: number, // Changed to number only as per repository
        hoursSpent: number
    ): Promise<ActivityMember> {
        try {
            // Validate hours spent
            if (hoursSpent < 0) {
                throw new ActivityError('Hours spent cannot be negative', 'VALIDATION_ERROR');
            }

            // Check if activity exists
            const activity = await activityRepository.findById(activityId);
            if (!activity) {
                throw new ActivityError('Activity not found', 'NOT_FOUND');
            }

            // Check max participants if set
            if (activity.max_participants) {
                const currentParticipants = await activityRepository.getParticipantsCount(activityId);
                if (currentParticipants >= activity.max_participants) {
                    throw new ActivityError('Activity has reached maximum participants', 'MAX_PARTICIPANTS');
                }
            }

            return await activityRepository.addMember(activityId, memberId, hoursSpent) as ActivityMember;
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

    async removeMemberFromActivity(
        activityId: string | number, 
        memberId: number  // Changed to number only as per repository
    ): Promise<boolean> {
        try {
            // Check if activity exists
            const activity = await activityRepository.findById(activityId);
            if (!activity) {
                throw new ActivityError('Activity not found', 'NOT_FOUND');
            }

            // Check if member is in activity
            const membership = await activityRepository.getMembership(activityId, memberId);
            if (!membership) {
                throw new ActivityError('Member not found in activity', 'NOT_FOUND');
            }

            await activityRepository.removeMember(activityId, memberId);
            return true;
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

    async updateActivity(id: string | number, updateData: ActivityUpdateData): Promise<Activity> {
        try {
            // Check if activity exists
            const activity = await activityRepository.findById(id);
            if (!activity) {
                throw new ActivityError('Activity not found', 'NOT_FOUND');
            }

            // Validate dates if they're being updated
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

            const updatedActivity = await activityRepository.update(id, updateData);
            if (!updatedActivity) {
                throw new ActivityError('Failed to update activity', 'UPDATE_ERROR');
            }

            return updatedActivity;
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
            // Check if activity exists
            const activity = await activityRepository.findById(id);
            if (!activity) {
                throw new ActivityError('Activity not found', 'NOT_FOUND');
            }

            // Attempt to delete the activity
            await activityRepository.delete(id);
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