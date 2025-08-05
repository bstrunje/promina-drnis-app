import { MembershipDetails, MembershipPeriod, MembershipEndReason } from '../shared/types/membership.js';
import { Request } from 'express';
import { getCurrentDate } from '../utils/dateUtils.js';
import prisma from '../utils/prisma.js';

const membershipRepository = {
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
    console.log(`[MEMBERSHIP] Ažuriranje perioda članstva za člana ${memberId}...`);

    await prisma.$transaction(async (tx) => {
      // Sigurna provjera jest li u testnom načinu rada
      const isTestMode = req ? (req as any).isTestMode || false : false;
      if (isTestMode) {
        console.log(`[MEMBERSHIP] 🧪 Testni način rada: Ažuriranje razdoblja članstva za člana ${memberId}`);
      }

      // Izbriši postojeće periode (briše SVE periode, pažljivo!)
      await tx.membershipPeriod.deleteMany({
        where: { member_id: memberId }
      });
      console.log(`[MEMBERSHIP] Obrisani postojeći periodi za člana ${memberId}`);

      // Insert new periods using Prisma createMany
      if (periods.length > 0) {
        await tx.membershipPeriod.createMany({
          data: periods.map(period => ({
            member_id: memberId,
            start_date: period.start_date,
            end_date: period.end_date || null,
            end_reason: period.end_reason || null,
            is_test_data: isTestMode
          }))
        });
        console.log(`[MEMBERSHIP] Kreirano ${periods.length} novih perioda za člana ${memberId}`);
      }

      // Provjeri ima li član aktivnih perioda (bez end_date) - Prisma count
      const activeCount = await tx.membershipPeriod.count({
        where: {
          member_id: memberId,
          end_date: null
        }
      });

      console.log(`[MEMBERSHIP] Broj aktivnih perioda za člana ${memberId}: ${activeCount}`);

      // Provjeri ima li barem jedan zatvoren period s razlogom
      const hasEndedPeriods = periods.some(p => p.end_date && p.end_reason);
      console.log(`[MEMBERSHIP] Ima završenih perioda za člana ${memberId}: ${hasEndedPeriods}`);

      // Ako nema aktivnih perioda, član je izvedeno 'inactive' (ali status se NE zapisuje u tablicu)
      if (activeCount === 0 && hasEndedPeriods) {
        console.log(`[MEMBERSHIP] Član ${memberId} je logički INACTIVE (nema aktivnih perioda). Status u bazi ostaje nepromijenjen.`);
        // Status 'inactive' se ne zapisuje u tablicu members!
        // Odluka: status 'inactive' je izveden i koristi se samo u helper funkcijama i prikazu.
      } else if (activeCount > 0) {
        // Osiguraj da je član aktivan ako ima aktivnih perioda
        console.log(`[MEMBERSHIP] Postavljam člana ${memberId} kao aktivnog - ima ${activeCount} aktivnih perioda`);
        await tx.member.update({
          where: { member_id: memberId },
          data: { status: 'registered' }
        });

        // Provjeri status nakon promjene
        const updatedMember = await tx.member.findUnique({
          where: { member_id: memberId },
          select: { status: true }
        });
        console.log(`[MEMBERSHIP] Status člana ${memberId} nakon ažuriranja: ${updatedMember?.status}`);
      }

      console.log(`[MEMBERSHIP] Uspješno ažurirani periodi članstva za člana ${memberId}`);
    });
  },

  async getCurrentPeriod(memberId: number): Promise<MembershipPeriod | null> {
    const result = await prisma.membershipPeriod.findFirst({
      where: {
        member_id: memberId,
        end_date: null
      }
    });

    if (!result) {
      return null;
    }

    // Transformacija Prisma rezultata u MembershipPeriod interface
    return {
      period_id: result.period_id,
      member_id: result.member_id!, // member_id neće biti null jer tražimo po member_id
      start_date: result.start_date.toISOString(),
      end_date: result.end_date?.toISOString(),
      end_reason: result.end_reason as MembershipEndReason | undefined
    };
  },

  async createMembershipPeriod(memberId: number, startDate: Date, req?: Request): Promise<void> {
    // Sigurna provjera jest li u testnom načinu rada
    const isTestMode = req ? (req as any).isTestMode || false : false;
    if (isTestMode) {
      console.log(`🧪 Testni način rada: Stvaranje novog razdoblja članstva za člana ${memberId}`);
    }

    await prisma.membershipPeriod.create({
      data: {
        member_id: memberId,
        start_date: startDate,
        is_test_data: isTestMode
      }
    });
  },

  async endMembershipPeriod(
    periodId: number,
    endDate: Date,
    endReason: MembershipEndReason
  ): Promise<MembershipPeriod> {
    // Ažuriraj period članstva i vrati ažurirani redak
    const updatedPeriod = await prisma.membershipPeriod.update({
      where: { period_id: periodId },
      data: {
        end_date: endDate,
        end_reason: endReason
      }
    });

    const memberId = updatedPeriod.member_id!;

    // Provjeri ima li član drugih aktivnih perioda članstva
    const activeCount = await prisma.membershipPeriod.count({
      where: {
        member_id: memberId,
        end_date: null
      }
    });

    // Ako nema drugih aktivnih perioda, član je logički 'inactive'
    if (activeCount === 0) {
      console.log(`Član ${memberId} je sada logički NEAKTIVAN (nema aktivnih perioda članstva). Status u bazi ostaje nepromijenjen.`);
    }

    // Transformacija Prisma rezultata u MembershipPeriod interface
    return {
      period_id: updatedPeriod.period_id,
      member_id: updatedPeriod.member_id!,
      start_date: updatedPeriod.start_date.toISOString(),
      end_date: updatedPeriod.end_date?.toISOString(),
      end_reason: updatedPeriod.end_reason as MembershipEndReason | undefined
    };
  },

  async getMembershipPeriods(memberId: number): Promise<MembershipPeriod[]> {
    const result = await prisma.membershipPeriod.findMany({
      where: {
        member_id: memberId
      },
      orderBy: {
        start_date: 'desc'
      }
    });

    // Transformacija Prisma rezultata u MembershipPeriod interface
    return result.map(period => ({
      period_id: period.period_id,
      member_id: period.member_id!, // member_id neće biti null jer tražimo po member_id
      start_date: period.start_date.toISOString(),
      end_date: period.end_date?.toISOString(),
      end_reason: period.end_reason as MembershipEndReason | undefined
    }));
  },

  async updatePeriodEndReason(
    periodId: number,
    endReason: MembershipEndReason
  ): Promise<void> {
    await prisma.membershipPeriod.update({
      where: { period_id: periodId },
      data: { end_reason: endReason }
    });
  },

  async assignCardNumber(memberId: number, cardNumber: string): Promise<void> {
    await prisma.membershipDetails.upsert({
      where: { member_id: memberId },
      update: { card_number: cardNumber },
      create: { member_id: memberId, card_number: cardNumber }
    });
  },

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
    console.log(`[MEMBERSHIP] Završavam istekla članstva za godinu ${year}...`);

    await prisma.$transaction(async (tx) => {
      // 1. Dohvati ID-eve svih članova kojima ističe članarina (nisu platili za `year`)
      //    i koji su trenutno 'registered' - koristimo Prisma raw query za složeni join
      const expiredMembers = await tx.$queryRaw<{ member_id: number }[]>`
            SELECT m.member_id 
            FROM members m
            LEFT JOIN membership_details md ON m.member_id = md.member_id
            WHERE m.status = 'registered' AND (md.fee_payment_year < ${year} OR md.fee_payment_year IS NULL)
        `;

      const memberIdsToExpire = expiredMembers.map(row => row.member_id);

      if (memberIdsToExpire.length === 0) {
        console.log(`[MEMBERSHIP] Nema članova s isteklim članstvom za godinu ${year}.`);
        return;
      }

      console.log(`[MEMBERSHIP] Pronađeno ${memberIdsToExpire.length} članova kojima ističe članarina:`, memberIdsToExpire);

      // 2. Ažuriraj status i sate za te članove u tablici `members` - Prisma updateMany
      await tx.member.updateMany({
        where: {
          member_id: { in: memberIdsToExpire }
        },
        data: {
          status: 'inactive',
          total_hours: 0
        }
      });
      console.log(`[MEMBERSHIP] Ažuriran status na 'inactive' i resetirani sati za ${memberIdsToExpire.length} članova`);

      // 3. Završi njihova aktivna razdoblja članstva u `membership_periods` - Prisma updateMany
      await tx.membershipPeriod.updateMany({
        where: {
          end_date: null,
          member_id: { in: memberIdsToExpire }
        },
        data: {
          end_date: getCurrentDate(),
          end_reason: 'non_payment'
        }
      });
      console.log(`[MEMBERSHIP] Završena aktivna razdoblja članstva za ${memberIdsToExpire.length} članova`);

      console.log(`[MEMBERSHIP] Uspješno ažurirano ${memberIdsToExpire.length} članova. Status postavljen na 'inactive' i sati resetirani.`);
    });
  }
};

export default membershipRepository;