// backend/src/services/member.service.js
import memberRepository from '../repositories/member.repository.js';

const memberService = {
    async getAllMembers() {
        try {
            return await memberRepository.findAll();
        } catch (error) {
            throw new Error('Error fetching members: ' + error.message);
        }
    },

    async getMemberById(memberId) {
        try {
            const member = await memberRepository.findById(memberId);
            if (!member) {
                throw new Error('Member not found');
            }
            return member;
        } catch (error) {
            throw new Error('Error fetching member: ' + error.message);
        }
    },

    async updateMember(memberId, memberData) {
        try {
            const member = await memberRepository.update(memberId, memberData);
            if (!member) {
                throw new Error('Member not found');
            }
            return member;
        } catch (error) {
            throw new Error('Error updating member: ' + error.message);
        }
    },

    async getMemberStats(memberId) {
        try {
            const stats = await memberRepository.getStats(memberId);
            return stats || { 
                total_activities: 0, 
                total_hours: 0, 
                membership_type: 'passive', 
                status: 'inactive' 
            };
        } catch (error) {
            throw new Error('Error fetching member statistics: ' + error.message);
        }
    },

    async createMember(memberData) {
        try {
            return await memberRepository.create(memberData);
        } catch (error) {
            throw new Error('Error creating member: ' + error.message);
        }
    },

    async deleteMember(memberId) {
        try {
            const member = await memberRepository.delete(memberId);
            if (!member) {
                throw new Error('Member not found');
            }
            return member;
        } catch (error) {
            throw new Error('Error deleting member: ' + error.message);
        }
    }
};

export default memberService;