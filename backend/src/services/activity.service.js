// backend/src/services/activity.service.js
import activityRepository from '../repositories/activity.repository.js';

const activityService = {
    async getAllActivities() {
        try {
            return await activityRepository.findAll();
        } catch (error) {
            throw new Error('Error fetching activities: ' + error.message);
        }
    },

    async getActivityById(id) {
        try {
            const activity = await activityRepository.findById(id);
            if (!activity) {
                throw new Error('Activity not found');
            }
            return activity;
        } catch (error) {
            throw new Error('Error fetching activity: ' + error.message);
        }
    },

    async createActivity(activityData) {
        try {
            // Add validation if needed
            if (!activityData.title) {
                throw new Error('Activity title is required');
            }
            
            // You might want to add more validations here
            if (!activityData.start_date || !activityData.end_date) {
                throw new Error('Start and end dates are required');
            }

            return await activityRepository.create(activityData);
        } catch (error) {
            throw new Error('Error creating activity: ' + error.message);
        }
    },

    async addMemberToActivity(activityId, memberId, hoursSpent) {
        try {
            // Validate hours spent
            if (hoursSpent < 0) {
                throw new Error('Hours spent cannot be negative');
            }

            // You might want to add validation to check if activity exists
            const activity = await activityRepository.findById(activityId);
            if (!activity) {
                throw new Error('Activity not found');
            }

            return await activityRepository.addMember(activityId, memberId, hoursSpent);
        } catch (error) {
            throw new Error('Error adding member to activity: ' + error.message);
        }
    },

    async removeMemberFromActivity(activityId, memberId) {
        try {
            // You might want to add validation to check if activity exists
            const activity = await activityRepository.findById(activityId);
            if (!activity) {
                throw new Error('Activity not found');
            }

            await activityRepository.removeMember(activityId, memberId);
            return true;
        } catch (error) {
            throw new Error('Error removing member from activity: ' + error.message);
        }
    }
};

export default activityService;