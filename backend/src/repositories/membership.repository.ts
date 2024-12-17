import db from '../utils/db.js';
import { PoolClient } from 'pg';
import { MembershipDetails, MembershipPeriod, MembershipEndReason } from '@shared/membership';

const membershipRepository = {
    async getMembershipDetails(memberId: number): Promise<MembershipDetails | null> {
        const result = await db.query<MembershipDetails>(
            'SELECT card_number, fee_payment_year, card_stamp_issued, fee_payment_date FROM membership_details WHERE member_id = $1',
            [memberId]
        );
        return result.rows[0] || null;
    },

    async updateMembershipDetails(memberId: number, details: Partial<MembershipDetails>): Promise<MembershipDetails> {
        const result = await db.query<MembershipDetails>(
            `INSERT INTO membership_details (member_id, card_number, fee_payment_year, card_stamp_issued, fee_payment_date)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (member_id) DO UPDATE
             SET card_number = EXCLUDED.card_number,
                 fee_payment_year = EXCLUDED.fee_payment_year,
                 card_stamp_issued = EXCLUDED.card_stamp_issued,
                 fee_payment_date = EXCLUDED.fee_payment_date
             RETURNING *, (SELECT life_status FROM members WHERE member_id = $1) as life_status`,
            [memberId, details.card_number, details.fee_payment_year, details.card_stamp_issued, details.fee_payment_date]
        );
        return result.rows[0];
    },

    async getMembershipPeriods(memberId: number): Promise<MembershipPeriod[]> {
        const result = await db.query<MembershipPeriod>(
            'SELECT * FROM membership_periods WHERE member_id = $1 ORDER BY start_date',
            [memberId]
        );
        return result.rows;
    },

    async createMembershipPeriod(memberId: number, startDate: Date): Promise<MembershipPeriod> {
        const result = await db.query<MembershipPeriod>(
            'INSERT INTO membership_periods (member_id, start_date) VALUES ($1, $2) RETURNING *',
            [memberId, startDate]
        );
        return result.rows[0];
    },

    async endMembershipPeriod(periodId: number, endDate: Date, reason: MembershipEndReason): Promise<MembershipPeriod> {
        const result = await db.query<MembershipPeriod>(
            'UPDATE membership_periods SET end_date = $1, end_reason = $2 WHERE period_id = $3 RETURNING *',
            [endDate, reason, periodId]
        );
        return result.rows[0];
    },

    async getCurrentPeriod(memberId: number): Promise<MembershipPeriod | null> {
        const result = await db.query<MembershipPeriod>(
            'SELECT * FROM membership_periods WHERE member_id = $1 AND end_date IS NULL',
            [memberId]
        );
        return result.rows[0] || null;
    },

    async checkActiveMembership(memberId: number): Promise<boolean> {
        const result = await db.query(
            'SELECT EXISTS(SELECT 1 FROM membership_periods WHERE member_id = $1 AND end_date IS NULL)',
            [memberId]
        );
        return result.rows[0].exists;
    },

    async endExpiredMemberships(year: number): Promise<void> {
        await db.query(
            `UPDATE membership_periods 
             SET end_date = $1, end_reason = 'non_payment'
             WHERE end_date IS NULL 
             AND member_id IN (
                SELECT m.member_id 
                FROM members m
                LEFT JOIN membership_details md ON m.member_id = md.member_id
                WHERE md.fee_payment_year < $2
             )`,
            [new Date(year, 11, 31), year]
        );
    }
};

export default membershipRepository;