import db from '../utils/db.js';
import memberRepository from '../repositories/member.repository.js';
import { Member, MemberStats, MemberUpdateData, MemberCreateData } from '../repositories/member.repository.js';

interface MemberWithActivities extends Member {
    activities?: {
        activity_id: number;
        title: string;
        date: string;
        hours_spent: number;
    }[];
}

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
            if (memberData.total_hours !== undefined) {
                const currentHours = await db.query(`
                    SELECT COALESCE(SUM(hours_spent), 0) as total_hours
                    FROM activity_participants
                    WHERE member_id = $1 AND verified_at IS NOT NULL
                `, [memberId]);
                
                if (memberData.total_hours < parseFloat(currentHours.rows[0].total_hours)) {
                    throw new Error('Cannot set total hours less than verified activity hours');
                }
            }

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
            const totalHoursResult = await db.query(`
                SELECT COALESCE(SUM(hours_spent), 0) as total_hours
                FROM activity_participants
                WHERE member_id = $1 AND verified_at IS NOT NULL
            `, [memberId]);
            
            stats.total_hours = parseFloat(totalHoursResult.rows[0].total_hours);
            
            return await memberRepository.getStats(memberId);
            
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