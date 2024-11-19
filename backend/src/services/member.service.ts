import memberRepository, { Member, MemberStats, MemberUpdateData, MemberCreateData } from '../repositories/member.repository.js';

const memberService = {
    async getAllMembers(): Promise<Member[]> {
        try {
            return await memberRepository.findAll();
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error('Error fetching members: ' + errorMessage);
        }
    },

    async getMemberById(memberId: number): Promise<Member | null> {
        try {
            const member = await memberRepository.findById(memberId);
            if (!member) {
                return null;
            }
            return member;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error('Error fetching member: ' + errorMessage);
        }
    },

    async updateMember(memberId: number, memberData: MemberUpdateData): Promise<Member> {
        try {
            return await memberRepository.update(memberId, memberData);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error('Error updating member: ' + errorMessage);
        }
    },

    async getMemberStats(memberId: number): Promise<MemberStats> {
        try {
            const stats = await memberRepository.getStats(memberId);
            if (!stats) {
                throw new Error('Member stats not found');
            }
            return stats;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error('Error fetching member statistics: ' + errorMessage);
        }
    },

    async createMember(memberData: MemberCreateData): Promise<Member> {
        try {
            return await memberRepository.create(memberData);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error('Error creating member: ' + errorMessage);
        }
    },

    async deleteMember(memberId: number): Promise<Member | null> {
        try {
            const deletedMember = await memberRepository.delete(memberId);
            if (!deletedMember) {
                return null;
            }
            return deletedMember;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error('Error deleting member: ' + errorMessage);
        }
    }
};

export default memberService;