// backend/src/controllers/activity.controller.ts
import { Request, Response } from 'express';
import { DatabaseUser } from '../middleware/authMiddleware';
import activityService from '../services/activity.service';
import { ActivityCreateInput } from '@shared/types';

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

// Extend Express Request to include user
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

    async createActivity(
        req: Request<{}, {}, ActivityCreateData>, 
        res: Response
    ): Promise<void> {
        try {
            const activityData: ActivityCreateInput = {
                ...req.body,
                created_by: req.user?.id // Using the user info from request
            };
            
            const activity = await activityService.createActivity(activityData);
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

    async updateActivity(
        req: Request<{ id: string }, {}, ActivityUpdateData>,
        res: Response
    ): Promise<void> {
        try {
            const { id } = req.params;
            const updateData = req.body;
            const updatedActivity = await activityService.updateActivity(id, updateData);
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

    async addMemberToActivity(
        req: Request<
        { activityId: string; memberId: string }, 
        {}, 
        AddMemberData
    >, 
    res: Response
): Promise<void> {
    try {
        const { activityId, memberId } = req.params;
        const { hoursSpent } = req.body;
        
        const result = await activityService.addMemberToActivity(
            activityId,
            parseInt(memberId, 10), // Convert string to number
            hoursSpent
        );
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

    
    async removeMemberFromActivity(
        req: Request<{ activityId: string; memberId: string }>, 
    res: Response
): Promise<void> {
    try {
        const { activityId, memberId } = req.params;
        await activityService.removeMemberFromActivity(
            activityId,
            parseInt(memberId, 10)  // Convert string to number
        );
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

    async deleteActivity(
        req: Request<{ id: string }>,
        res: Response
    ): Promise<void> {
        try {
            const { id } = req.params;
            await activityService.deleteActivity(id);
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