// src/services/membership.service.ts
import db from '../utils/db';
import membershipRepository from '../repositories/membership.repository.js';
import { MembershipDetails, MembershipPeriod, MembershipEndReason } from '@shared/membership';
import { Member } from '../../../shared/types/member.js';
import memberRepository from '../repositories/member.repository.js';

const membershipService = {
    async processFeePayment(memberId: number, paymentDate: Date): Promise<void> {
        try {
            const paymentYear = paymentDate.getFullYear();
            const startDate = new Date(paymentDate);
            
            // If payment after November 1st, membership starts next year
            if (paymentDate.getMonth() >= 10) { // 10 is November (0-based)
                startDate.setFullYear(paymentYear + 1, 0, 1); // January 1st next year
            } else {
                // For payments before November, membership starts immediately
                startDate.setHours(0, 0, 0, 0); // Start of the payment day
            }
    
            await db.transaction(async (client) => {
                // Update membership details
                await membershipRepository.updateMembershipDetails(memberId, {
                    fee_payment_year: paymentYear,
                    fee_payment_date: paymentDate.toISOString()
                });
    
                // Check if there's an active period
                const currentPeriod = await membershipRepository.getCurrentPeriod(memberId);
                
                if (!currentPeriod) {
                    // Create new membership period
                    await membershipRepository.createMembershipPeriod(memberId, startDate);
                } else {
                    // If there's an active period but it was due to non-payment, end it
                    if (currentPeriod.end_reason === 'non_payment') {
                        await membershipRepository.endMembershipPeriod(
                            currentPeriod.period_id,
                            new Date(),
                            'non_payment'
                        );
                        // Create new period
                        await membershipRepository.createMembershipPeriod(memberId, startDate);
                    }
                }
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error('Error processing fee payment: ' + errorMessage);
        }
    },

    async getMembershipDetails(memberId: number): Promise<MembershipDetails | undefined> {
        try {
            const details = await membershipRepository.getMembershipDetails(memberId);
            
            if (!details) {
                return undefined;
            }
            
            return {
                card_number: details.card_number,
                fee_payment_year: details.fee_payment_year,
                card_stamp_issued: details.card_stamp_issued,
                fee_payment_date: details.fee_payment_date ? 
                    new Date(details.fee_payment_date).toISOString() : 
                    undefined
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error('Error fetching membership details: ' + errorMessage);
        }
    },

    async updateCardDetails(memberId: number, cardNumber: string, stampIssued: boolean): Promise<MembershipDetails> {
        return membershipRepository.updateMembershipDetails(memberId, {
            card_number: cardNumber,
            card_stamp_issued: stampIssued
        });
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
        periods: MembershipPeriod[],
        totalDuration: string,
        currentPeriod?: MembershipPeriod
    }> {
        const periods = await membershipRepository.getMembershipPeriods(memberId);
        const currentPeriod = periods.find(p => !p.end_date);

        // Calculate total duration
        let totalDays = 0;
        periods.forEach(period => {
            const end = period.end_date || new Date();
            const start = new Date(period.start_date);
            totalDays += Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        });

        const years = Math.floor(totalDays / 365);
        const months = Math.floor((totalDays % 365) / 30);
        const days = totalDays % 30;

        return {
            periods,
            totalDuration: `${years} years, ${months} months, ${days} days`,
            currentPeriod
        };
    },

    async checkAutoTerminations(): Promise<void> {
        const currentYear = new Date().getFullYear();
        await membershipRepository.endExpiredMemberships(currentYear);
    },

};

export default membershipService;