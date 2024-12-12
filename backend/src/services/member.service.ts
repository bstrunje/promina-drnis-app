// src/services/member.service.ts
import db from '../utils/db.js';
import membershipService from './membership.service.js';
import memberRepository, { MemberStats, MemberCreateData, MemberUpdateData } from '../repositories/member.repository.js';
import { Member } from '@shared/member';
import bcrypt from 'bcrypt';

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

    async updateMemberRole(memberId: number, role: 'member' | 'admin' | 'superuser'): Promise<Member> {
        try {
            return await memberRepository.updateRole(memberId, role);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error('Error updating member role: ' + errorMessage);
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
            // Set default values for new members
            const newMemberData: MemberCreateData = {
                ...memberData,
                membership_type: memberData.membership_type || 'regular'
            };
            return await memberRepository.create(newMemberData);
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
    },

    async assignPassword(memberId: number, password: string): Promise<void> {
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            await memberRepository.updatePassword(memberId, hashedPassword);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error('Error assigning password: ' + errorMessage);
        }
    },

    async getMemberWithActivities(memberId: number): Promise<MemberWithActivities | null> {
        try {
            const member = await this.getMemberById(memberId);
            if (!member) return null;

            const activitiesQuery = await db.query(`
                SELECT 
                    a.activity_id,
                    a.title,
                    a.start_date as date,
                    ap.hours_spent
                FROM activities a
                JOIN activity_participants ap ON a.activity_id = ap.activity_id
                WHERE ap.member_id = $1
                ORDER BY a.start_date DESC
            `, [memberId]);

            return {
                ...member,
                activities: activitiesQuery.rows
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error('Error fetching member with activities: ' + errorMessage);
        }
    },
	
	async getMemberWithDetails(memberId: number): Promise<Member | null> {
        try {
            const member = await memberRepository.findById(memberId);
            if (!member) return null;

            // Get membership details
            const membershipDetails = await membershipService.getMembershipHistory(memberId);
            const currentPeriod = membershipDetails.currentPeriod;
            
            return {
                ...member,
                membership_details: (await membershipService.getMembershipDetails(memberId)) || undefined,
                membership_history: membershipDetails,
                activity_status: (member.total_hours ?? 0) >= 20 ? 'active' : 'passive'
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error('Error fetching member with details: ' + errorMessage);
        }
    },

    // Add to existing member service methods
    async updateMembershipFee(memberId: number, paymentDate: Date): Promise<void> {
        try {
            await membershipService.processFeePayment(memberId, paymentDate);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error('Error processing fee payment: ' + errorMessage);
        }
    },

    async updateMembershipCard(
        memberId: number, 
        cardNumber: string, 
        stampIssued: boolean
    ): Promise<void> {
        try {
            await membershipService.updateCardDetails(memberId, cardNumber, stampIssued);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error('Error updating card details: ' + errorMessage);
        }
    },

    async terminateMembership(
        memberId: number, 
        reason: 'withdrawal' | 'non_payment' | 'expulsion' | 'death', 
        endDate?: Date
    ): Promise<void> {
        try {
            await membershipService.endMembership(memberId, reason, endDate);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error('Error terminating membership: ' + errorMessage);
        }
    }
};

export default memberService;