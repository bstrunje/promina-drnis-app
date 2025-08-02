import db from '../utils/db.js';
import { PoolClient } from 'pg';
import { MembershipDetails, MembershipPeriod, MembershipEndReason } from '../shared/types/membership.js';
import { Request } from 'express';
import { getCurrentDate, parseDate, formatDate } from '../utils/dateUtils.js';
import prisma from '../utils/prisma.js';

const membershipRepository = {
    // OPTIMIZACIJA: Prisma upit umjesto db.query
    async getMembershipDetails(memberId: number): Promise<MembershipDetails | null> {
        console.log(`[MEMBERSHIP] Dohvaćam detalje članstva za člana ${memberId}...`);
        try {
            const membershipDetails = await prisma.membershipDetails.findUnique({
                where: { member_id: memberId },
                select: {
                    card_number: true,
                    fee_payment_year: true,
                    card_stamp_issued: true,
                    fee_payment_date: true
                }
            });
            
            console.log(`[MEMBERSHIP] Pronađeni detalji za člana ${memberId}:`, membershipDetails ? 'DA' : 'NE');
            return membershipDetails as MembershipDetails | null;
        } catch (error) {
            console.error(`[MEMBERSHIP] Greška pri dohvaćanju detalja za člana ${memberId}:`, error);
            throw error;
        }
    },

    // OPTIMIZACIJA: Prisma transakcija umjesto db.transaction
    async updateMembershipDetails(
        memberId: number,
        details: {
          fee_payment_year?: number;
          fee_payment_date?: Date;
          card_number?: string;
          card_stamp_issued?: boolean;
          next_year_stamp_issued?: boolean;
        }
      ): Promise<void> {
        console.log(`[MEMBERSHIP] Ažuriram detalje članstva za člana ${memberId}...`);
        
        return await prisma.$transaction(async (tx) => {
          try {
            // OPTIMIZACIJA: Prisma findUnique umjesto client.query
            const memberExists = await tx.member.findUnique({
              where: { member_id: memberId },
              select: { member_id: true }
            });
        
            if (!memberExists) {
              throw new Error('Member not found');
            }
        
            // OPTIMIZACIJA: Provjera duplikata samo ako je potrebno
            if (details.card_number) {
              console.log(`[MEMBERSHIP] Provjeravam duplikat kartice: ${details.card_number}`);
              
              // OPTIMIZACIJA: Prisma findFirst umjesto client.query
              const existingCard = await tx.membershipDetails.findFirst({
                where: {
                  card_number: details.card_number,
                  member_id: { not: memberId }
                },
                select: { member_id: true }
              });
              
              if (existingCard) {
                throw new Error(`Card number ${details.card_number} is already assigned to another member`);
              }
            }
        
            // OPTIMIZACIJA: Priprema podataka za Prisma upsert
            const updateData: any = {};
            
            if (details.fee_payment_year !== undefined) {
              updateData.fee_payment_year = details.fee_payment_year;
            }
            if (details.fee_payment_date !== undefined) {
              updateData.fee_payment_date = details.fee_payment_date;
            }
            if (details.card_number !== undefined) {
              updateData.card_number = details.card_number;
            }
            if (details.card_stamp_issued !== undefined) {
              updateData.card_stamp_issued = details.card_stamp_issued;
            }
            if (details.next_year_stamp_issued !== undefined) {
              updateData.next_year_stamp_issued = details.next_year_stamp_issued;
            }
            
            console.log(`[MEMBERSHIP] Izvršavam UPSERT za detalje članstva s ${Object.keys(updateData).length} polja`);
            
            // OPTIMIZACIJA: Prisma upsert umjesto kompleksni INSERT...ON CONFLICT
            await tx.membershipDetails.upsert({
              where: { member_id: memberId },
              update: updateData,
              create: {
                member_id: memberId,
                ...updateData
              }
            });
            
            console.log(`[MEMBERSHIP] Uspješno ažurirani detalji članstva za člana ${memberId}`);
          } catch (error) {
            console.error('[MEMBERSHIP] Greška u updateMembershipDetails:', error);
            throw error;
          }
        });
      },

      async updateMembershipPeriods(
        memberId: number, 
        periods: MembershipPeriod[],
        req?: Request
      ): Promise<void> {
        await db.transaction(async client => {
          // Sigurna provjera jest li u testnom načinu rada
          const isTestMode = req ? (req as any).isTestMode || false : false;
          if (isTestMode) {
            console.log(`🧪 Testni način rada: Ažuriranje razdoblja članstva za člana ${memberId}`);
          }
          
          // Izbriši postojeće periode (briše SVE periode, pažljivo!)
          await client.query(
            'DELETE FROM membership_periods WHERE member_id = $1',
            [memberId]
          );
      
          // Insert new periods
          for (const period of periods) {
            await client.query(
              `INSERT INTO membership_periods 
               (member_id, start_date, end_date, end_reason, is_test_data) 
               VALUES ($1, $2, $3, $4, $5)`,
              [
                memberId,
                period.start_date,
                period.end_date || null,
                period.end_reason || null,
                isTestMode
              ]
            );
          }
        
          // Provjeri ima li član aktivnih perioda (bez end_date)
          const activePeriodsResult = await client.query(
            `SELECT COUNT(*) as active_count 
             FROM membership_periods 
             WHERE member_id = $1 AND end_date IS NULL`,
            [memberId]
          );
          
          console.log(`DEBUG: Active periods count for member ${memberId}:`, activePeriodsResult.rows[0].active_count);
          console.log(`DEBUG: Type of active_count:`, typeof activePeriodsResult.rows[0].active_count);
        
          // Provjeri ima li barem jedan zatvoren period s razlogom
          const hasEndedPeriods = periods.some(p => p.end_date && p.end_reason);
          console.log(`DEBUG: Has ended periods for member ${memberId}: ${hasEndedPeriods}, periods:`, 
            periods.map(p => ({ 
              start: p.start_date, 
              end: p.end_date || "null", 
              reason: p.end_reason || "null" 
            }))
          );
        
          // Preciznija obrada rezultata COUNT - može doći u različitim formatima ovisno o PostgreSQL driveru
          let activeCount = 0;
          
          if (typeof activePeriodsResult.rows[0].active_count === 'string') {
            activeCount = parseInt(activePeriodsResult.rows[0].active_count);
          } else {
            activeCount = Number(activePeriodsResult.rows[0].active_count);
          }
          
          console.log(`DEBUG: Processed activeCount (after conversion):`, activeCount);
        
          // Ako nema aktivnih perioda, član je izvedeno 'inactive' (ali status se NE zapisuje u tablicu)
          if (activeCount === 0 && hasEndedPeriods) {
            console.log(`Member ${memberId} je logički INACTIVE (nema aktivnih perioda). Status u bazi ostaje nepromijenjen.`);
            // Status 'inactive' se ne zapisuje u tablicu members!
            // Odluka: status 'inactive' je izveden i koristi se samo u helper funkcijama i prikazu.
          } else {
            // Osiguraj da je član aktivan ako ima aktivnih perioda
            console.log(`Ensuring member ${memberId} is active - has active membership periods: ${activeCount}`);
            await client.query(
              'UPDATE members SET status = $1 WHERE member_id = $2',
              ['registered', memberId]
            );
            
            // Dodatno logirajmo status nakon promjene
            const statusCheck = await client.query('SELECT status FROM members WHERE member_id = $1', [memberId]);
            console.log(`DEBUG: Member ${memberId} status after update: ${statusCheck.rows[0].status}`);
          }
        });
      },

    async getCurrentPeriod(memberId: number): Promise<MembershipPeriod | null> {
        const result = await db.query<MembershipPeriod>(
            'SELECT * FROM membership_periods WHERE member_id = $1 AND end_date IS NULL',
            [memberId]
        );
        return result.rows[0] || null;
    },

    async createMembershipPeriod(memberId: number, startDate: Date, req?: Request): Promise<void> {
        // Sigurna provjera jest li u testnom načinu rada
        const isTestMode = req ? (req as any).isTestMode || false : false;
        if (isTestMode) {
          console.log(`🧪 Testni način rada: Stvaranje novog razdoblja članstva za člana ${memberId}`);
        }
        
        await db.query(
            'INSERT INTO membership_periods (member_id, start_date, is_test_data) VALUES ($1, $2, $3)',
            [memberId, startDate, isTestMode]
        );
    },

    async endMembershipPeriod(
        periodId: number,
        endDate: Date,
        endReason: MembershipEndReason
    ): Promise<MembershipPeriod> {
        // Ažuriraj period članstva i vrati ažurirani redak
        const result = await db.query(
            `UPDATE membership_periods 
             SET end_date = $1, end_reason = $2 
             WHERE id = $3
             RETURNING *`,
            [endDate, endReason, periodId]
        );
        const updatedPeriod = result.rows[0];

        const memberId = updatedPeriod.member_id;

        // Provjeri ima li član drugih aktivnih perioda članstva
        const activePeriodsResult = await db.query(
            `SELECT COUNT(*) as active_count 
             FROM membership_periods 
             WHERE member_id = $1 AND end_date IS NULL`,
            [memberId]
        );

        const activeCount = parseInt(activePeriodsResult.rows[0].active_count, 10) || 0;

        // Ako nema drugih aktivnih perioda, član je logički 'inactive'
        if (activeCount === 0) {
            console.log(`Član ${memberId} je sada logički NEAKTIVAN (nema aktivnih perioda članstva). Status u bazi ostaje nepromijenjen.`);
        }

        return updatedPeriod;
    },

    async getMembershipPeriods(memberId: number): Promise<MembershipPeriod[]> {
        const result = await db.query<MembershipPeriod>(
            'SELECT * FROM membership_periods WHERE member_id = $1 ORDER BY start_date DESC',
            [memberId]
        );
        return result.rows;
    },

    async updatePeriodEndReason(
      periodId: number,
      endReason: MembershipEndReason
    ): Promise<void> {
      await db.query(
        `UPDATE membership_periods 
         SET end_reason = $1
         WHERE period_id = $2`,
        [endReason, periodId]
      );
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

    // OPTIMIZACIJA: Prisma upit umjesto db.query
    async updateStampStatus(memberId: number, isIssued: boolean): Promise<void> {
        console.log(`[MEMBERSHIP] Ažuriram status markice za člana ${memberId}: ${isIssued}`);
        try {
            await prisma.membershipDetails.update({
                where: { member_id: memberId },
                data: { card_stamp_issued: isIssued }
            });
            console.log(`[MEMBERSHIP] Uspješno ažuriran status markice za člana ${memberId}`);
        } catch (error) {
            console.error(`[MEMBERSHIP] Greška pri ažuriranju statusa markice za člana ${memberId}:`, error);
            throw error;
        }
    },

    async endExpiredMemberships(year: number): Promise<void> {
        await db.transaction(async (client) => {
            // 1. Dohvati ID-eve svih članova kojima ističe članarina (nisu platili za `year`)
            //    i koji su trenutno 'registered'.
            const expiredMembersResult = await client.query<{ member_id: number }>(
                `SELECT m.member_id 
                 FROM members m
                 LEFT JOIN membership_details md ON m.member_id = md.member_id
                 WHERE m.status = 'registered' AND (md.fee_payment_year < $1 OR md.fee_payment_year IS NULL)`,
                [year]
            );

            const memberIdsToExpire = expiredMembersResult.rows.map(row => row.member_id);

            if (memberIdsToExpire.length === 0) {
                console.log(`Nema članova s isteklim članstvom za godinu ${year}.`);
                return;
            }

            console.log(`Pronađeno ${memberIdsToExpire.length} članova kojima ističe članarina:`, memberIdsToExpire);

            // 2. Ažuriraj status i sate za te članove u tablici `members`
            await client.query(
                `UPDATE members
                 SET status = 'inactive', total_hours = 0
                 WHERE member_id = ANY($1::int[])`,
                [memberIdsToExpire]
            );

            // 3. Završi njihova aktivna razdoblja članstva u `membership_periods`
            await client.query(
                `UPDATE membership_periods 
                 SET end_date = $1, end_reason = 'non_payment'
                 WHERE end_date IS NULL AND member_id = ANY($2::int[])`,
                [getCurrentDate(), memberIdsToExpire]
            );

            console.log(`Uspješno ažurirano ${memberIdsToExpire.length} članova. Status postavljen na 'inactive' i sati resetirani.`);
        });
    }
};

export default membershipRepository;