// backend/src/controllers/member.controller.js
import memberService from '../services/member.service.js';

const memberController = {
    async getAllMembers(req, res) {
        try {
            const members = await memberService.getAllMembers();
            res.json(members);
        } catch (error) {
            console.error('Controller error:', error);
            res.status(500).json({ message: error.message });
        }
    },

    async getMemberById(req, res) {
        try {
            const { memberId } = req.params;
            const member = await memberService.getMemberById(memberId);
            res.json(member);
        } catch (error) {
            console.error('Controller error:', error);
            if (error.message.includes('not found')) {
                res.status(404).json({ message: error.message });
            } else {
                res.status(500).json({ message: error.message });
            }
        }
    },

    async updateMember(req, res) {
        try {
            const { memberId } = req.params;
            const member = await memberService.updateMember(memberId, req.body);
            res.json(member);
        } catch (error) {
            console.error('Controller error:', error);
            if (error.message.includes('not found')) {
                res.status(404).json({ message: error.message });
            } else {
                res.status(500).json({ message: error.message });
            }
        }
    },

    async getMemberStats(req, res) {
        try {
            const { memberId } = req.params;
            const stats = await memberService.getMemberStats(memberId);
            res.json(stats);
        } catch (error) {
            console.error('Controller error:', error);
            res.status(500).json({ message: error.message });
        }
    },

    async createMember(req, res) {
        try {
            const member = await memberService.createMember(req.body);
            res.status(201).json(member);
        } catch (error) {
            console.error('Controller error:', error);
            res.status(500).json({ message: error.message });
        }
    },

    async deleteMember(req, res) {
        try {
            const { memberId } = req.params;
            await memberService.deleteMember(memberId);
            res.json({ message: 'Member deleted successfully' });
        } catch (error) {
            console.error('Controller error:', error);
            if (error.message.includes('not found')) {
                res.status(404).json({ message: error.message });
            } else {
                res.status(500).json({ message: error.message });
            }
        }
    }
};

export default memberController;