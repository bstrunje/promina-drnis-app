// backend/src/controllers/member.controller.ts
import { Request, Response } from 'express';
import memberService from '../services/member.service.js';
import { MemberCreateData, MemberUpdateData } from '../repositories/member.repository.js';
import { DatabaseUser } from '../middleware/authMiddleware.js';

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: DatabaseUser
        }
    }
}

function handleControllerError(error: unknown, res: Response): void {
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

const memberController = {
    async getAllMembers(req: Request, res: Response): Promise<void> {
        try {
            const members = await memberService.getAllMembers();
            res.json(members);
        } catch (error) {
            handleControllerError(error, res);
        }
    },

    async getMemberById(req: Request<{ memberId: string }>, res: Response): Promise<void> {
        try {
            const memberId = parseInt(req.params.memberId, 10);
            if (isNaN(memberId)) {
                res.status(400).json({ message: 'Invalid member ID' });
                return;
            }
            const member = await memberService.getMemberById(memberId);
            if (member === null) {
                res.status(404).json({ message: 'Member not found' });
            } else {
                res.json(member);
            }
        } catch (error) {
            handleControllerError(error, res);
        }
    },

    async updateMember(
        req: Request<{ memberId: string }, {}, MemberUpdateData>,
        res: Response
    ): Promise<void> {
        try {
            const memberId = parseInt(req.params.memberId, 10);
            if (isNaN(memberId)) {
                res.status(400).json({ message: 'Invalid member ID' });
                return;
            }
            const member = await memberService.updateMember(memberId, req.body);
            res.json(member);
        } catch (error) {
            handleControllerError(error, res);
        }
    },

    async getMemberStats(req: Request<{ memberId: string }>, res: Response): Promise<void> {
        try {
            const memberId = parseInt(req.params.memberId, 10);
            if (isNaN(memberId)) {
                res.status(400).json({ message: 'Invalid member ID' });
                return;
            }
            const stats = await memberService.getMemberStats(memberId);
            res.json(stats);
        } catch (error) {
            handleControllerError(error, res);
        }
    },

    async createMember(req: Request<{}, {}, MemberCreateData>, res: Response): Promise<void> {
        try {
            // Validate required fields
            const requiredFields = ['first_name', 'last_name', 'gender', 'email', 'oib'];
            if (!req.body.first_name) {
                res.status(400).json({ message: 'first_name is required' });
                return;
            }
            if (!req.body.last_name) {
                res.status(400).json({ message: 'last_name is required' });
                return;
            }
            if (!req.body.gender) {
                res.status(400).json({ message: 'gender is required' });
                return;
            }
            if (!req.body.email) {
                res.status(400).json({ message: 'email is required' });
                return;
            }
            if (!req.body.oib) {
                res.status(400).json({ message: 'oib is required' });
                return;
            }

            // Validate OIB format
            if (!/^\d{11}$/.test(req.body.oib)) {
                res.status(400).json({ message: 'OIB must be exactly 11 digits' });
                return;
            }

            const member = await memberService.createMember(req.body);
            res.status(201).json(member);
        } catch (error) {
            handleControllerError(error, res);
        }
    },

    async deleteMember(req: Request<{ memberId: string }>, res: Response): Promise<void> {
        try {
            const memberId = parseInt(req.params.memberId, 10);
            if (isNaN(memberId)) {
                res.status(400).json({ message: 'Invalid member ID' });
                return;
            }
            await memberService.deleteMember(memberId);
            res.json({ message: 'Member deleted successfully' });
        } catch (error) {
            handleControllerError(error, res);
        }
    },

    async assignPassword(req: Request, res: Response): Promise<void> {
        try {
            const { memberId, password } = req.body;
            if (!memberId || !password) {
                res.status(400).json({ message: 'Member ID and password are required' });
                return;
            }
            await memberService.assignPassword(memberId, password);
            res.status(200).json({ message: 'Password assigned successfully' });
        } catch (error) {
            handleControllerError(error, res);
            console.error('Error in assignPassword controller:', error);
            res.status(500).json({ message: 'Failed to assign password' });
        }
    },

    async getMemberWithActivities(req: Request<{ memberId: string }>, res: Response): Promise<void> {
        try {
            const memberId = parseInt(req.params.memberId, 10);
            if (isNaN(memberId)) {
                res.status(400).json({ message: 'Invalid member ID' });
                return;
            }
            const memberWithActivities = await memberService.getMemberWithActivities(memberId);
            if (!memberWithActivities) {
                res.status(404).json({ message: 'Member not found' });
                return;
            }
            res.json(memberWithActivities);
        } catch (error) {
            handleControllerError(error, res);
        }
    }
};

export default memberController;