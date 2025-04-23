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

const membershipService = {
  async processFeePayment(
    memberId: number,
    paymentDate: Date,
    req: Request,
    isRenewalPayment?: boolean
  ): Promise<Member | null> {
    try {
      // Get system settings
      const settings = await prisma.systemSettings.findFirst({
        where: { id: "default" },
      });

      const renewalStartDay = settings?.renewalStartDay || 31;

      const validPaymentDate = new Date(paymentDate);
      validPaymentDate.setHours(12, 0, 0, 0); // Standardize time

      const member = await memberRepository.findById(memberId);
      if (!member) {
        throw new Error("Member not found");
      }

      const paymentYear = paymentDate.getFullYear();
      const paymentMonth = paymentDate.getMonth();
      const paymentDay = paymentDate.getDate();

      // Create cutoff date (October 31st of current year)
      const cutoffDate = new Date(paymentYear, 9, renewalStartDay); // Month 9 is October
      const startDate = new Date(paymentDate);

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
        startDate.setFullYear(paymentYear + 1, 0, 1); // January 1st of next year
      } else if (validPaymentDate > cutoffDate && isNewMember) {
        console.log(`Payment after cutoff date for NEW member - still counting for current year`);
        // Za nove članove ne mijenjamo godinu, čak i ako je kasno u godini
      }

      await db.transaction(async (client) => {
        await membershipRepository.updateMembershipDetails(memberId, {
          fee_payment_year: paymentYear,
          fee_payment_date: validPaymentDate,
        });

        // Check current period
        const currentPeriod = await membershipRepository.getCurrentPeriod(
          memberId
        );

        // Handle period management
        if (!currentPeriod) {
          await membershipRepository.createMembershipPeriod(
            memberId,
            startDate
          );
        } else if (currentPeriod.end_reason === "non_payment") {
          await membershipRepository.endMembershipPeriod(
            currentPeriod.period_id,
            new Date(),
            "non_payment"
          );
          await membershipRepository.createMembershipPeriod(
            memberId,
            startDate
          );
        }
      });

      await auditService.logAction(
        "MEMBERSHIP_FEE_PAYMENT",
        memberId,
        `Membership fee paid for ${paymentYear}`,
        req,
        "success"
      );

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
      const result = await db.query(`
        SELECT 
          fee_payment_year, 
          fee_payment_date,
          EXTRACT(YEAR FROM CURRENT_DATE) as current_year
        FROM membership_details
        WHERE member_id = $1
      `, [memberId]);
      
      if (result.rowCount === 0) return false;
      
      const { fee_payment_year, current_year } = result.rows[0];
      return fee_payment_year >= current_year;
    } catch (error) {
      console.error('Error checking membership status:', error);
      return false; // Sigurnosno - ako ne možemo provjeriti, tretiramo kao neaktivno
    }
  },

  async getMembershipDetails(
    memberId: number
  ): Promise<MembershipDetails | undefined> {
    try {
      const details = await membershipRepository.getMembershipDetails(memberId);

      if (!details) {
        return undefined;
      }

      return {
        card_number: details.card_number,
        fee_payment_year: Number(details.fee_payment_year),
        card_stamp_issued: Boolean(details.card_stamp_issued),
        fee_payment_date: details.fee_payment_date,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error("Error fetching membership details: " + errorMessage);
    }
  },

  async updateCardDetails(memberId: number, cardNumber: string, stampIssued: boolean | null): Promise<void> {
    try {
      // Provjera postoji li već zapis za ovog člana
      const existingCheck = await db.query(
        `SELECT member_id FROM membership_details WHERE member_id = $1`,
        [memberId]
      );

      // Sigurna provjera za rowCount (može biti null)
      const memberExists = (existingCheck?.rowCount ?? 0) > 0;

      if (!memberExists) {
        // Ako zapis ne postoji, kreiramo novi sa svim vrijednostima
        // VAŽNO: Eksplicitno postavljamo card_stamp_issued na FALSE
        console.log(`Creating new membership details for member ${memberId}, card_number: ${cardNumber}, stamp_issued: FALSE (forced)`);
        await db.query(
          `INSERT INTO membership_details (member_id, card_number, card_stamp_issued)
           VALUES ($1, $2, FALSE)`,
          [memberId, cardNumber || ""]
        );

        // Ako dodajemo novi broj kartice, brišemo sve stare zapise iz password_update_queue
        if (cardNumber !== undefined && cardNumber !== null && cardNumber !== "") {
          await db.query(
            `DELETE FROM password_update_queue WHERE member_id = $1 AND card_number != $2`,
            [memberId, cardNumber.trim()]
          );
        }

        return;
      }

      // Ako zapis postoji, ažuriramo samo ono što je potrebno

      // Ako je proslijeđen broj kartice, ažuriramo ga
      if (cardNumber !== undefined && cardNumber !== null && cardNumber !== "") {
        console.log(`Updating card number for member ${memberId} to: ${cardNumber}`);
        await db.query(
          `UPDATE membership_details SET card_number = $2 WHERE member_id = $1`,
          [memberId, cardNumber.trim()]
        );

        // Brišemo sve stare zapise iz password_update_queue za ovog člana
        // i ostavljamo samo trenutni broj kartice (ako postoji u queue)
        await db.query(
          `DELETE FROM password_update_queue WHERE member_id = $1 AND card_number != $2`,
          [memberId, cardNumber.trim()]
        );
      }

      // Ako je proslijeđen status markice, ažuriramo ga u odvojenoj operaciji
      // SAMO ako je stampIssued eksplicitno postavljen
      if (stampIssued !== null && stampIssued !== undefined) {
        console.log(`Explicitly updating stamp status for member ${memberId} to: ${stampIssued}`);
        await db.query(
          `UPDATE membership_details SET card_stamp_issued = $2 WHERE member_id = $1`,
          [memberId, stampIssued]
        );
      }
    } catch (error) {
      console.error('Error updating card details:', error);
      throw new Error(`Failed to update card details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async updateMembershipHistory(
    memberId: number,
    periods: MembershipPeriod[]
  ): Promise<void> {
    try {
      const member = await memberRepository.findById(memberId);
      if (!member) throw new Error("Member not found");

      await membershipRepository.updateMembershipPeriods(memberId, periods);
    } catch (error) {
      console.error("Error updating membership history:", error);
      throw error;
    }
  },

  async endMembership(
    memberId: number,
    reason: MembershipEndReason,
    endDate: Date = new Date()
  ): Promise<void> {
    const currentPeriod = await membershipRepository.getCurrentPeriod(memberId);
    if (currentPeriod) {
      await membershipRepository.endMembershipPeriod(
        currentPeriod.period_id,
        endDate,
        reason
      );
    }
  },

  async getMembershipHistory(memberId: number): Promise<{
    periods: MembershipPeriod[];
    totalDuration: string;
    currentPeriod?: MembershipPeriod;
  }> {
    const periods = await membershipRepository.getMembershipPeriods(memberId);
    const currentPeriod = periods.find((p) => !p.end_date);

    // Calculate total duration
    let totalDays = 0;
    periods.forEach((period) => {
      const end = new Date(period.end_date || new Date());
      const start = new Date(period.start_date);
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
      const currentYear = new Date().getFullYear();
      const currentDate = new Date();

      // Dohvati postavke sustava
      const settings = await prisma.systemSettings.findFirst({
        where: { id: "default" },
      });

      // Koristi postavke ili zadane vrijednosti
      const cutoffMonth = settings?.renewalStartMonth || 10; // Default je studeni (10)
      const cutoffDay = settings?.renewalStartDay || 1;

      // Kreiraj datum za provjeru (31.12. tekuće godine)
      const yearEndDate = new Date(currentYear, 11, 31); // Mjesec 11 je prosinac

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

  async updateAllMembershipStatuses(): Promise<{
    updatedCount: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let updatedCount = 0;
    
    try {
      const currentYear = new Date().getFullYear();
      
      // Dohvati sve članove s detaljima članstva
      const result = await db.query<{
        member_id: number;
        full_name: string;
        fee_payment_year: number | null;
      }>(`
        SELECT m.member_id, m.full_name, md.fee_payment_year 
        FROM members m
        JOIN membership_details md ON m.member_id = md.member_id
      `);
      
      // Ažuriraj active_until za sve članove
      const updateResult = await db.query(`
        UPDATE membership_details
        SET active_until = CASE 
          WHEN fee_payment_year IS NULL THEN NULL
          WHEN fee_payment_year >= $1 THEN MAKE_DATE(fee_payment_year, 12, 31)
          ELSE MAKE_DATE(fee_payment_year, 12, 31)
        END
        WHERE member_id IN (
          SELECT member_id FROM membership_details
        )
        RETURNING member_id
      `, [currentYear]);
      
      updatedCount = updateResult.rowCount ?? 0; // Koristi nullish coalescing da osiguramo broj
      
      console.log(`✅ Ažurirano ${updatedCount} članstava`);
      
      // Logiraj status svakog člana
      for (const member of result.rows) {
        const memberFeeYear = typeof member.fee_payment_year === 'number' ? member.fee_payment_year : 0;
        const isActive = memberFeeYear >= currentYear;
        console.log(`Član ${member.full_name} (ID: ${member.member_id}): ${isActive ? 'aktivno' : 'isteklo'} članstvo (plaćeno za ${member.fee_payment_year || 'nije plaćeno'}, trenutna godina: ${currentYear})`);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Greška prilikom ažuriranja članstava:', errorMessage);
      errors.push(errorMessage);
    }
    
    return { updatedCount, errors };
  },
};

export default membershipService;
