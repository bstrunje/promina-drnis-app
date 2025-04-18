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
    req: Request
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

      // If payment is after cutoff date, membership starts next year
      if (validPaymentDate > cutoffDate) {
        startDate.setFullYear(paymentYear + 1, 0, 1); // January 1st of next year
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
      
      const memberExists = existingCheck.rowCount && existingCheck.rowCount > 0;
      
      if (!memberExists) {
        // Ako zapis ne postoji, kreiramo novi sa svim vrijednostima
        await db.query(
          `INSERT INTO membership_details (member_id, card_number, card_stamp_issued)
           VALUES ($1, $2, $3)`,
          [memberId, cardNumber || "", stampIssued === null ? false : stampIssued]
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
      if (stampIssued !== null && stampIssued !== undefined) {
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
};

export default membershipService;
