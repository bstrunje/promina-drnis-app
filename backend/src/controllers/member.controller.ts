import { Request, Response } from 'express';
import memberService from '../services/member.service.js';
import { MemberCreateData, MemberUpdateData } from '../repositories/member.repository.js';

interface MemberStats {
    totalActivities: number;
    totalHours: number;
    activityBreakdown: {
        type: string;
        count: number;
    }[];
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
            const member = await memberService.updateMember(memberId, req.body as MemberUpdateData);
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
            const member = await memberService.createMember(req.body as MemberCreateData);
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
    }
};

export default memberController;