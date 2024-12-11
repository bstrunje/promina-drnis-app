import { Request, Response } from 'express';
import { DatabaseUser } from '../middleware/authMiddleware.js';
import activityService from '../services/activity.service.js';
import { ActivityCreateInput } from '@shared/activity.js';
import auditService from '../services/audit.service.js';

// Interfaces
interface ActivityCreateData {
    title: string;
    description?: string;
    start_date: Date;
    end_date: Date;
    location?: string;
    difficulty_level?: 'easy' | 'moderate' | 'difficult' | 'very_difficult' | 'extreme';
    max_participants?: number;
    activity_type_id: number;
    created_by?: number;
    created_at: Date;
}

interface AddMemberData {
    hoursSpent: number;
}

interface ActivityUpdateData {
    title?: string;
    description?: string;
    start_date?: Date;
    end_date?: Date;
    location?: string;
    difficulty_level?: 'easy' | 'moderate' | 'difficult' | 'very_difficult' | 'extreme';
    max_participants?: number;
    activity_type_id?: number;
}

declare global {
    namespace Express {
        interface Request {
            user?: DatabaseUser
        }
    }
}

const activityController = {
    async getAllActivities(req: Request, res: Response): Promise<void> {
        try {
            const activities = await activityService.getAllActivities();
            res.json(activities);
        } catch (error) {
            console.error('Controller error:', error);
            res.status(500).json({ 
                message: error instanceof Error ? error.message : 'Unknown error' 
            });
        }
    },

    async getActivityById(req: Request<{ id: string }>, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const activity = await activityService.getActivityById(id);
            res.json(activity);
        } catch (error) {
            console.error('Controller error:', error);
            if (error instanceof Error && error.message.includes('not found')) {
                res.status(404).json({ message: error.message });
            } else {
                res.status(500).json({ 
                    message: error instanceof Error ? error.message : 'Unknown error' 
                });
            }
        }
    },

    async createActivity(req: Request<{}, {}, ActivityCreateData>, res: Response): Promise<void> {
        try {
            const activityData = {
                ...req.body,
                created_by: req.user?.id
            };
            const activity = await activityService.createActivity(activityData);
            if (req.user?.id) {
                await auditService.logAction(
                    'CREATE_ACTIVITY',
                    req.user.id,
                    `Created activity: ${activity.title}`,
                    req,
                    'success'
                );
            }
            res.status(201).json(activity);
        } catch (error) {
            console.error('Controller error:', error);
            if (error instanceof Error && error.message.includes('required')) {
                res.status(400).json({ message: error.message });
            } else {
                res.status(500).json({ 
                    message: error instanceof Error ? error.message : 'Unknown error' 
                });
            }
        }
    },
    
    async updateActivity(req: Request<{ id: string }, {}, ActivityUpdateData>, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const updateData = req.body;
            const updatedActivity = await activityService.updateActivity(id, updateData);
            if (req.user?.id) {
                await auditService.logAction(
                    'UPDATE_ACTIVITY',
                    req.user.id,
                    `Updated activity: ${updatedActivity.title}`,
                    req,
                    'success'
                );
            }
            res.json(updatedActivity);
        } catch (error) {
            console.error('Controller error:', error);
            if (error instanceof Error) {
                if (error.message.includes('not found')) {
                    res.status(404).json({ message: error.message });
                } else {
                    res.status(500).json({ message: error.message });
                }
            } else {
                res.status(500).json({ message: 'Unknown error' });
            }
        }
    },
    
    async addMemberToActivity(req: Request<{ activityId: string; memberId: string }, {}, { hoursSpent: number }>, res: Response): Promise<void> {
        try {
            const { activityId, memberId } = req.params;
            const { hoursSpent } = req.body;
            const result = await activityService.addMemberToActivity(activityId, parseInt(memberId, 10), hoursSpent);
            if (req.user?.id) {
                await auditService.logAction(
                    'ADD_MEMBER_TO_ACTIVITY',
                    req.user.id,
                    `Added member ${memberId} to activity ${activityId} with ${hoursSpent} hours`,
                    req,
                    'success',
                    parseInt(memberId, 10)
                );
            }
            res.status(200).json(result);
        } catch (error) {
            console.error('Controller error:', error);
            if (error instanceof Error) {
                if (error.message.includes('not found')) {
                    res.status(404).json({ message: error.message });
                } else if (error.message.includes('cannot be negative')) {
                    res.status(400).json({ message: error.message });
                } else {
                    res.status(500).json({ message: error.message });
                }
            } else {
                res.status(500).json({ message: 'Unknown error' });
            }
        }
    },
    
    async removeMemberFromActivity(req: Request<{ activityId: string; memberId: string }>, res: Response): Promise<void> {
        try {
            const { activityId, memberId } = req.params;
            await activityService.removeMemberFromActivity(activityId, parseInt(memberId, 10));
            if (req.user?.id) {
                await auditService.logAction(
                    'REMOVE_MEMBER_FROM_ACTIVITY',
                    req.user.id,
                    `Removed member ${memberId} from activity ${activityId}`,
                    req,
                    'success',
                    parseInt(memberId, 10)
                );
            }
            res.json({ message: 'Member removed from activity successfully' });
        } catch (error) {
            console.error('Controller error:', error);
            if (error instanceof Error && error.message.includes('not found')) {
                res.status(404).json({ message: error.message });
            } else {
                res.status(500).json({ 
                    message: error instanceof Error ? error.message : 'Unknown error' 
                });
            }
        }
    },
    
    async deleteActivity(req: Request<{ id: string }>, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            await activityService.deleteActivity(id);
            if (req.user?.id) {
                await auditService.logAction(
                    'DELETE_ACTIVITY',
                    req.user.id,
                    `Deleted activity ${id}`,
                    req,
                    'success'
                );
            }
            res.json({ message: 'Activity deleted successfully' });
        } catch (error) {
            console.error('Controller error:', error);
            if (error instanceof Error) {
                if (error.message.includes('not found')) {
                    res.status(404).json({ message: error.message });
                } else {
                    res.status(500).json({ message: error.message });
                }
            } else {
                res.status(500).json({ message: 'Unknown error' });
            }
        }
    }
};

export default activityController;