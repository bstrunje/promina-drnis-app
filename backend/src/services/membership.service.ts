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

const membershipService = {
  async processFeePayment(memberId: number, paymentDate: Date, req: Request): Promise<Member | null> {
    try {
        const validPaymentDate = new Date(paymentDate);
        validPaymentDate.setHours(12, 0, 0, 0); // Standardize time

        // Get member details first
        const member = await memberRepository.findById(memberId);
        if (!member) {
            throw new Error('Member not found');
        }

        const paymentYear = paymentDate.getFullYear();
        const startDate = new Date(paymentDate);

        // Special handling for late-year payments
        if (paymentDate.getMonth() >= 10) { // November or December
            startDate.setFullYear(paymentYear + 1, 0, 1); // Start next year
        }

        await db.transaction(async (client) => {
            // Update membership details
            await membershipRepository.updateMembershipDetails(memberId, {
                fee_payment_year: paymentYear,
                fee_payment_date: validPaymentDate
            });

            // Check current period
            const currentPeriod = await membershipRepository.getCurrentPeriod(memberId);

            // Handle period creation/update
            if (!currentPeriod) {
                await membershipRepository.createMembershipPeriod(memberId, startDate);
            } else if (currentPeriod.end_reason === 'non_payment') {
                await membershipRepository.endMembershipPeriod(
                    currentPeriod.period_id,
                    new Date(),
                    'non_payment'
                );
                await membershipRepository.createMembershipPeriod(memberId, startDate);
            }
        });

        await auditService.logAction(
            'MEMBERSHIP_FEE_PAYMENT',
            memberId,
            `Membership fee paid for ${paymentYear}`,
            req,
            'success'
        );

        // Return the updated member data
        return await memberRepository.findById(memberId);

    } catch (error) {
        throw new Error(`Error processing fee payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        fee_payment_date: details.fee_payment_date
    };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error("Error fetching membership details: " + errorMessage);
    }
  },

  async updateCardDetails(
    memberId: number,
    cardNumber: string,
    stampIssued: boolean
  ): Promise<void> {
    try {
      // Log the initial request
      console.log('Processing card details update:', { memberId, cardNumber, stampIssued });
    
      // Validate inputs
      if (!memberId) {
        throw new Error('Member ID is required');
      }
  
      // Format validation - only check length
      if (cardNumber) {
        if (!/^\d{5}$/.test(cardNumber)) {
          throw new Error('Card number must be exactly 5 digits');
        }
      }
  
      // Check if member exists first
      const member = await memberRepository.findById(memberId);
      if (!member) {
        throw new Error('Member not found');
      }
  
      // Verify stamp issuance logic
      if (stampIssued && !cardNumber) {
        throw new Error('Cannot issue stamp without a card number');
      }
  
      // Attempt to update the details
      await membershipRepository.updateMembershipDetails(memberId, {
        card_number: cardNumber,
        card_stamp_issued: stampIssued
      });
  
      // Log successful update
      console.log('Card details updated successfully:', { memberId, cardNumber, stampIssued });
    } catch (error) {
      console.error('Failed to update card details:', error);
      
      // Specific error handling
      if (error instanceof Error) {
        if (error.message.includes('duplicate')) {
          throw new Error(`Card number ${cardNumber} is already assigned to another member`);
        }
        if (error.message.includes('not found')) {
          throw new Error('Member not found or inactive');
        }
        throw error;
      }
      
      throw new Error('Failed to update card details');
    }
  },

  async updateMembershipHistory(
    memberId: number,
    periods: MembershipPeriod[]
  ): Promise<void> {
    try {
      const member = await memberRepository.findById(memberId);
      if (!member) throw new Error('Member not found');
  
      await membershipRepository.updateMembershipPeriods(memberId, periods);
    } catch (error) {
      console.error('Error updating membership history:', error);
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
      const end = period.end_date || new Date();
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
    const currentYear = new Date().getFullYear();
    await membershipRepository.endExpiredMemberships(currentYear);
  },
};

export default membershipService;
