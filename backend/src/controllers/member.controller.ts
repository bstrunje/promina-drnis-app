import { Request, Response } from 'express';
import memberService from '../services/member.service.js';

interface MemberCreateData {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    emergencyContact?: string;
    membershipType?: string;
    notes?: string;
}

interface MemberUpdateData extends Partial<MemberCreateData> {
    status?: string;
}

interface MemberStats {
    totalActivities: number;
    totalHours: number;
    activityBreakdown: {
        type: string;
        count: number;
    }[];
}

const memberController = {
    async getAllMembers(req: Request, res: Response): Promise<void> {
        try {
            const members = await memberService.getAllMembers();
            res.json(members);
        } catch (error) {
            console.error('Controller error:', error);
            res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
        }
    },

    async getMemberById(req: Request<{ memberId: string }>, res: Response): Promise<void> {
        try {
            const { memberId } = req.params;
            const member = await memberService.getMemberById(memberId);
            res.json(member);
        } catch (error) {
            console.error('Controller error:', error);
            if (error instanceof Error && error.message.includes('not found')) {
                res.status(404).json({ message: error.message });
            } else {
                res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
            }
        }
    },

    async updateMember(
        req: Request<{ memberId: string }, {}, MemberUpdateData>, 
        res: Response
    ): Promise<void> {
        try {
            const { memberId } = req.params;
            const member = await memberService.updateMember(memberId, req.body);
            res.json(member);
        } catch (error) {
            console.error('Controller error:', error);
            if (error instanceof Error && error.message.includes('not found')) {
                res.status(404).json({ message: error.message });
            } else {
                res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
            }
        }
    },

    async getMemberStats(req: Request<{ memberId: string }>, res: Response): Promise<void> {
        try {
            const { memberId } = req.params;
            const stats = await memberService.getMemberStats(memberId);
            res.json(stats);
        } catch (error) {
            console.error('Controller error:', error);
            res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
        }
    },

    async createMember(req: Request<{}, {}, MemberCreateData>, res: Response): Promise<void> {
        try {
            const member = await memberService.createMember(req.body);
            res.status(201).json(member);
        } catch (error) {
            console.error('Controller error:', error);
            res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
        }
    },

    async deleteMember(req: Request<{ memberId: string }>, res: Response): Promise<void> {
        try {
            const { memberId } = req.params;
            await memberService.deleteMember(memberId);
            res.json({ message: 'Member deleted successfully' });
        } catch (error) {
            console.error('Controller error:', error);
            if (error instanceof Error && error.message.includes('not found')) {
                res.status(404).json({ message: error.message });
            } else {
                res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
            }
        }
    }
};

export default memberController;