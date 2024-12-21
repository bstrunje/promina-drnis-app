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

    async updateMembershipDetails(
        memberId: number,
        details: {
          fee_payment_year?: number;
          fee_payment_date?: Date;
          card_number?: string;
          card_stamp_issued?: boolean;
        }
      ): Promise<void> {
        return await db.transaction(async (client) => {
          // Check if member exists
          const memberExists = await client.query(
            'SELECT 1 FROM members WHERE member_id = $1',
            [memberId]
          );
      
          if (!memberExists.rows.length) {
            throw new Error('Member not found');
          }
      
          // Check for duplicate card number
          if (details.card_number) {
            const existingCard = await client.query(
              'SELECT member_id FROM membership_details WHERE card_number = $1 AND member_id != $2',
              [details.card_number, memberId]
            );
            
            if (existingCard.rows.length) {
              throw new Error(`Card number ${details.card_number} is already in use by another member`);
            }
          }
      
          const setClause = Object.entries(details)
            .filter(([_, value]) => value !== undefined)
            .map(([key], index) => `${key} = $${index + 2}`)
            .join(', ');
      
          const values = Object.values(details)
            .filter(value => value !== undefined)
            .map(value => {
              if (value instanceof Date) {
                return value.toISOString();
              }
              return value;
            });
      
          await client.query(
            `UPDATE membership_details 
             SET ${setClause} 
             WHERE member_id = $1`,
            [memberId, ...values]
          );

          await db.query(
            `INSERT INTO membership_details (member_id, ${Object.keys(details).join(', ')})
             VALUES ($1, ${values.map((_, i) => `$${i + 2}`).join(', ')})
             ON CONFLICT (member_id) 
             DO UPDATE SET ${setClause}`,
            [memberId, ...values]
        );
        
        });
      },

    async getCurrentPeriod(memberId: number): Promise<MembershipPeriod | null> {
        const result = await db.query<MembershipPeriod>(
            'SELECT * FROM membership_periods WHERE member_id = $1 AND end_date IS NULL',
            [memberId]
        );
        return result.rows[0] || null;
    },

    async createMembershipPeriod(memberId: number, startDate: Date): Promise<void> {
        await db.query(
            'INSERT INTO membership_periods (member_id, start_date) VALUES ($1, $2)',
            [memberId, startDate]
        );
    },

    async endMembershipPeriod(
        periodId: number,
        endDate: Date,
        endReason: MembershipEndReason
    ): Promise<void> {
        await db.query(
            `UPDATE membership_periods 
             SET end_date = $1, end_reason = $2 
             WHERE period_id = $3`,
            [endDate, endReason, periodId]
        );
    },

    async getMembershipPeriods(memberId: number): Promise<MembershipPeriod[]> {
        const result = await db.query<MembershipPeriod>(
            'SELECT * FROM membership_periods WHERE member_id = $1 ORDER BY start_date DESC',
            [memberId]
        );
        return result.rows;
    },

    async assignCardNumber(memberId: number, cardNumber: string): Promise<void> {
        await db.query(
            `INSERT INTO membership_details (member_id, card_number) 
             VALUES ($1, $2)
             ON CONFLICT (member_id) 
             DO UPDATE SET card_number = EXCLUDED.card_number`,
            [memberId, cardNumber]
        );
    },

    async updateStampStatus(memberId: number, isIssued: boolean): Promise<void> {
        await db.query(
            `UPDATE membership_details 
             SET card_stamp_issued = $2 
             WHERE member_id = $1`,
            [memberId, isIssued]
        );
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