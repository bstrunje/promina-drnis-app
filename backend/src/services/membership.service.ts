// src/services/membership.service.ts
import db from "../utils/db.js";
import membershipRepository from "../repositories/membership.repository.js";
import { 
  MembershipDetails,
  MembershipPeriod,
  MembershipEndReason,
} from "../shared/types/membership.js";
import { Member } from "../shared/types/member.js";
import memberRepository from "../repositories/member.repository.js";
import auditService from "./audit.service.js";
import { Request } from "express";
import prisma from "../utils/prisma.js";
import { parseDate, getCurrentDate, formatDate, getCurrentYear } from '../utils/dateUtils.js';
import { updateAnnualStatistics } from './statistics.service.js';

// Definicija tipa za tijelo zahtjeva za ažuriranje članstva
interface MembershipUpdatePayload {
  paymentDate?: string;
  cardNumber?: string;
  stampIssued?: boolean;
  isRenewalPayment?: boolean;
}

const membershipService = {
  async processFeePayment(
    memberId: number,
    paymentDate: Date,
    userId?: number,
    isRenewalPayment?: boolean
  ): Promise<Member | null> {
    try {
      // Get system settings
      const settings = await prisma.systemSettings.findFirst({
        where: { id: "default" },
      });

      const renewalStartDay = settings?.renewalStartDay || 31;

      // Koristimo direktno Date objekt umjesto parsiranja, jer već imamo Date
      const validPaymentDate = new Date(paymentDate);
      validPaymentDate.setHours(12, 0, 0, 0); // Standardize time // Standardize time

      const member = await memberRepository.findById(memberId);
      if (!member) {
        throw new Error("Member not found");
      }

      const paymentYear = paymentDate.getFullYear();
      const paymentMonth = paymentDate.getMonth();
      const paymentDay = paymentDate.getDate();

      // Create cutoff date (October 31st of current year)
      const cutoffDate = new Date(paymentYear, 9, renewalStartDay); // Month 9 is October
      let startDate = validPaymentDate; // Koristi stvarni datum uplate kao početni datum

      // Provjeri je li ovo novi član (koji nikad nije platio članarinu)
      // ili postojeći član koji obnavlja članstvo
      const isNewMember = !member.membership_details?.fee_payment_date;

      // Ispiši važne informacije za dijagnostiku
      console.log(`Processing payment for member ${memberId}:`, {
        isNewMember,
        paymentDate: validPaymentDate,
        cutoffDate,
        isAfterCutoff: validPaymentDate > cutoffDate,
      });

      // Samo za postojeće članove koji produljuju članstvo:
      // Ako je plaćanje nakon cutoff datuma, članstvo počinje sljedeće godine
      if (validPaymentDate > cutoffDate && !isNewMember) {
        console.log(`Payment after cutoff date for EXISTING member - counting for next year`);
        startDate = new Date(paymentYear + 1, 0, 1); // Postavi na 1. siječnja sljedeće godine
      } else if (validPaymentDate > cutoffDate && isNewMember) {
        console.log(`Payment after cutoff date for NEW member - still counting for current year`);
        // Za nove članove ne mijenjamo godinu, čak i ako je kasno u godini
      }

      await db.transaction(async (client) => {
        await membershipRepository.updateMembershipDetails(memberId, {
          fee_payment_year: paymentYear,
          fee_payment_date: validPaymentDate,
        });

        // Automatski postaviti status člana na "registered" kad plati članarinu
        await prisma.member.update({
          where: { member_id: memberId },
          data: { status: 'registered' }
        });
        console.log(`✅ Status člana ${memberId} postavljen na "registered" nakon plaćanja članarine.`);

        // Check current period
        const currentPeriod = await membershipRepository.getCurrentPeriod(
          memberId
        );

        // Handle period management
        if (!currentPeriod) {
          await membershipRepository.createMembershipPeriod(
            memberId,
            validPaymentDate
          );
        } else if (currentPeriod.end_reason === "non_payment") {
          await membershipRepository.endMembershipPeriod(
            currentPeriod.period_id,
            getCurrentDate(),
            "non_payment"
          );
          await membershipRepository.createMembershipPeriod(
            memberId,
            validPaymentDate
          );
        }
      });

      if (userId) {
        await auditService.logAction(
          "MEMBERSHIP_FEE_PAYMENT",
          userId,
          `Membership fee paid for ${paymentYear}`,
          undefined, // req is now optional
          "success",
          memberId
        );
      }

      await updateAnnualStatistics(memberId, paymentYear);

      return await memberRepository.findById(memberId);
    } catch (error) {
      throw new Error(
        `Error processing fee payment: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  },

  async isMembershipActive(memberId: number): Promise<boolean> {
    try {
      const member = await memberRepository.findById(memberId);
      if (!member || !member.membership_details) {
        return false;
      }

      // Ako imamo fee_payment_year, usporedimo s trenutnom godinom
      if (member.membership_details.fee_payment_year) {
        const currentYear = getCurrentDate().getFullYear();
        return member.membership_details.fee_payment_year >= currentYear;
      }
      
      return false;
    } catch (error) {
      console.error("Error checking membership activity:", error);
      return false;
    }
  },

  async getMembershipDetails(
    memberId: number
  ): Promise<MembershipDetails | undefined> {
    try {
      const member = await memberRepository.findById(memberId);
      return member?.membership_details;
    } catch (error) {
      console.error("Error getting membership details:", error);
      return undefined;
    }
  },

  async updateCardDetails(memberId: number, cardNumber: string | undefined, stampIssued: boolean | null | undefined, userId?: number): Promise<void> {
    try {
      // Prvo dohvatimo trenutni broj kartice
      const details = await membershipRepository.getMembershipDetails(memberId);
      const previousCardNumber = details?.card_number;

      // Ako je član imao staru karticu i mijenja broj, označi staru kao potrošenu
      if (previousCardNumber && cardNumber !== undefined && previousCardNumber !== cardNumber && cardNumber.trim() !== "") {
        const cardNumberRepository = (await import('../repositories/cardnumber.repository.js')).default;
        await cardNumberRepository.markCardNumberConsumed(previousCardNumber, memberId);
      }
      console.log('==== MEMBERSHIP CARD UPDATE DETAILS ====');
      console.log(`Member ID: ${memberId}`);
      console.log(`Card number: "${cardNumber}"`);
      console.log(`Stamp issued: ${stampIssued}`);
      
      // Dohvati trenutni status člana prije transakcije
      const memberResult = await db.query(
        `SELECT status, registration_completed FROM members WHERE member_id = $1`,
        [memberId]
      );
      
      const member = memberResult.rows[0];
      console.log('Current member status before transaction:', member);
      
      // Započinjemo transakciju za osiguranje konzistentnosti podataka
      await db.transaction(async (client) => {
        // Prvo ažuriramo status člana na 'registered' i registration_completed na true
        // ako je dodijeljen broj kartice (preslikavamo ponašanje iz updateMemberWithCardAndPassword)
        // VAŽNO: Provjeravamo da li je cardNumber stvarno dodijeljen (nije prazan string)
        if (cardNumber !== undefined && cardNumber !== null && cardNumber.trim() !== "") {
          console.log(`Updating member status for member ${memberId} to: registered and registration_completed: true`);
          
          // Eksplicitno ažuriramo status člana
          const updateResult = await client.query(`
            UPDATE members
            SET status = 'registered', registration_completed = true
            WHERE member_id = $1
            RETURNING member_id, status, registration_completed
          `, [memberId]);
          
          console.log('Member status update result:', updateResult.rows[0]);
        } else {
          console.log(`Card number is empty or undefined, not updating member status`);
        }
        
        // Provjera postoji li već zapis za ovog člana
        const existingCheck = await client.query(
          `SELECT member_id, card_number FROM membership_details WHERE member_id = $1`,
          [memberId]
        );

        // Sigurna provjera za rowCount (može biti null)
        const memberExists = (existingCheck?.rowCount ?? 0) > 0;
        console.log('Membership details exist:', memberExists);
        if (memberExists) {
          console.log('Current card number:', existingCheck.rows[0].card_number);
        }
        
        // Zatim ažuriramo broj članske iskaznice
        if (!memberExists) {
          // Ako zapis ne postoji, kreiramo novi sa svim vrijednostima
          // VAŽNO: Eksplicitno postavljamo card_stamp_issued na FALSE
          console.log(`Creating new membership details for member ${memberId}, card_number: ${cardNumber}, stamp_issued: FALSE (forced)`);
          await client.query(
            `INSERT INTO membership_details (member_id, card_number, card_stamp_issued)
             VALUES ($1, $2, FALSE)`,
            [memberId, cardNumber || ""]
          );
        } else {
          // Ako je proslijeđen broj kartice, ažuriramo ga
          if (cardNumber !== undefined && cardNumber !== null && cardNumber.trim() !== "") {
            console.log(`Updating card number for member ${memberId} to: ${cardNumber}`);
            await client.query(
              `UPDATE membership_details SET card_number = $2 WHERE member_id = $1`,
              [memberId, cardNumber.trim()]
            );
          } else {
            console.log(`Card number is empty or undefined, not updating card number`);
          }

          // Ako je proslijeđen status markice, ažuriramo ga u odvojenoj operaciji
          // SAMO ako je stampIssued eksplicitno postavljen
          if (stampIssued !== null && stampIssued !== undefined) {
            console.log(`Explicitly updating stamp status for member ${memberId} to: ${stampIssued}`);
            await client.query(
              `UPDATE membership_details SET card_stamp_issued = $2 WHERE member_id = $1`,
              [memberId, stampIssued]
            );
          }
        }
        
        // Brišemo sve stare zapise iz password_update_queue za ovog člana
        // i ostavljamo samo trenutni broj kartice (ako postoji u queue)
        if (cardNumber !== undefined && cardNumber !== null && cardNumber.trim() !== "") {
          await client.query(
            `DELETE FROM password_update_queue WHERE member_id = $1 AND card_number != $2`,
            [memberId, cardNumber.trim()]
          );
          
          console.log('Card number updated successfully');
        }
        
        // Na kraju dohvatimo ažurirane podatke o članu za potvrdu
        const memberAfterUpdate = await client.query(
          'SELECT member_id, full_name, status, registration_completed FROM members WHERE member_id = $1',
          [memberId]
        );
        
        console.log('Member after all updates:', memberAfterUpdate.rows[0]);
      })
    } catch (error) {
      console.error('Error updating card details:', error);
      throw new Error(`Failed to update card details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async updateMembershipHistory(
    memberId: number,
    periods: MembershipPeriod[],
    userId?: number,
    updateMemberStatus: boolean = false
  ): Promise<void> {
    try {
      const member = await memberRepository.findById(memberId);
      if (!member) throw new Error("Member not found");

      await membershipRepository.updateMembershipPeriods(memberId, periods);
      
      // Automatsko ažuriranje statusa člana na temelju perioda
      if (updateMemberStatus) {
        // Provjeri postoji li aktivni period (bez end_date)
        const hasActivePeriod = periods.some(p => !p.end_date);
        
        if (hasActivePeriod) {
          // Koristimo Prisma umjesto memberRepository za ažuriranje statusa
          await prisma.member.update({
            where: { member_id: memberId },
            data: { status: 'registered' }
          });
          
          if (userId) {
            await auditService.logAction(
              "UPDATE_MEMBER_HISTORY",
              userId,
              `Updated membership history for member ${memberId}`,
              undefined, // req is now optional
              "success",
              memberId
            );
          }
        }
      }
    } catch (error) {
      console.error("Error updating membership history:", error);
      throw error;
    }
  },

  async updateMembership(
    memberId: number,
    payload: MembershipUpdatePayload,
    userId?: number
  ): Promise<Member | null> {
    const { paymentDate, cardNumber, stampIssued, isRenewalPayment } = payload;

    if (paymentDate) {
      await this.processFeePayment(
        memberId,
        parseDate(paymentDate),
        userId,
        isRenewalPayment
      );
    }

    if (typeof cardNumber !== 'undefined' || typeof stampIssued !== 'undefined') {
        await this.updateCardDetails(memberId, cardNumber, stampIssued, userId);
    }

    return memberRepository.findById(memberId);
  },

  async terminateMembership(
    memberId: number,
    reason: MembershipEndReason,
    userId?: number,
    endDateStr?: string
  ): Promise<void> {
    try {
        const endDate = endDateStr ? parseDate(endDateStr) : getCurrentDate();
        const currentPeriod = await membershipRepository.getCurrentPeriod(memberId);
        if (currentPeriod) {
            await membershipRepository.endMembershipPeriod(
                currentPeriod.period_id,
                endDate,
                reason
            );
        }

        await prisma.member.update({
          where: { member_id: memberId },
          data: { status: 'former_member' },
        });

        const details = await membershipRepository.getMembershipDetails(memberId);
        if (details?.card_number) {
            const cardNumberRepository = (await import('../repositories/cardnumber.repository.js')).default;
            await cardNumberRepository.markCardNumberConsumed(details.card_number, memberId);
        }

        if (userId) {
          await auditService.logAction(
            'TERMINATE_MEMBERSHIP',
            userId,
            `Terminated membership for member ${memberId} with reason: ${reason}`,
            undefined, // req is now optional
            'success',
            memberId
          );
        }
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error('Error terminating membership: ' + errorMessage);
    }
  },

  async updateMembershipEndReason(
    memberId: number,
    periodId: number,
    endReason: MembershipEndReason,
    userId?: number
  ): Promise<void> {
    try {
      const member = await memberRepository.findById(memberId);
      if (!member) throw new Error("Member not found");
  
      const periods = await membershipRepository.getMembershipPeriods(memberId);
      const periodToUpdate = periods.find(p => p.period_id === periodId);
      
      if (!periodToUpdate) {
        throw new Error("Membership period not found");
      }
      
      await membershipRepository.updatePeriodEndReason(periodId, endReason);

      if (userId) {
        await auditService.logAction(
          'UPDATE_MEMBERSHIP_END_REASON',
          userId,
          `Updated end reason for period ${periodId} for member ${memberId}`,
          undefined,
          'success',
          memberId
        );
      }
    } catch (error) {
      console.error("Error updating membership period end reason:", error);
      throw error;
    }
  },


  async getMembershipHistory(memberId: number, req?: Request): Promise<{
    periods: MembershipPeriod[];
    totalDuration: string;
    currentPeriod?: MembershipPeriod;
  }> {
    const periods = await membershipRepository.getMembershipPeriods(memberId);
    const currentPeriod = periods.find((p: MembershipPeriod) => !p.end_date);

    // Calculate total duration
    let totalDays = 0;
    periods.forEach((period: MembershipPeriod) => {
      const end = period.end_date ? parseDate(period.end_date) : getCurrentDate();
      const start = parseDate(period.start_date);
      totalDays += Math.floor(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      );
    });

    const years = Math.floor(totalDays / 365);
    const months = Math.floor((totalDays % 365) / 30);
    const days = totalDays % 30;

    return {
      periods,
      totalDuration: `${years} years, ${months} months, ${days} days`,
      currentPeriod,
    };
  },

  async checkAutoTerminations(): Promise<void> {
    try {
      const currentYear = getCurrentDate().getFullYear();
      const currentDate = getCurrentDate();

      // Dohvati postavke sustava
      const settings = await prisma.systemSettings.findFirst({
        where: { id: "default" },
      });

      // Koristi postavke ili zadane vrijednosti
      const cutoffMonth = settings?.renewalStartMonth || 10; // Default je studeni (10)
      const cutoffDay = settings?.renewalStartDay || 1;

      // Kreiraj datum za provjeru (31.12. tekuće godine)
      const yearEndDate = parseDate(`${currentYear}-12-31`); // Mjesec 11 je prosinac

      // Ako je trenutni datum nakon kraja godine, završi sva članstva koja nisu obnovljena
      if (currentDate >= yearEndDate) {
        await membershipRepository.endExpiredMemberships(currentYear);
      }

      return;
    } catch (error) {
      console.error("Greška prilikom automatske provjere članstava:", error);
      throw new Error(
        `Greška prilikom automatske provjere članstava: ${
          error instanceof Error ? error.message : "Nepoznata greška"
        }`
      );
    }
  },

  async endMembershipPeriod(
    periodId: number,
    endDate: Date,
    endReason: MembershipEndReason
  ): Promise<MembershipPeriod> {
    return await membershipRepository.endMembershipPeriod(
      periodId,
      endDate,
      endReason
    );
  },
};

export default membershipService;
