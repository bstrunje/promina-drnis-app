// src/services/membership.service.ts
import membershipRepository from '../repositories/membership.repository.js';
import { MembershipDetails, MembershipPeriod, MembershipEndReason } from '@shared/membership';

const membershipService = {
    async processFeePayment(memberId: number, paymentDate: Date): Promise<void> {
        const paymentYear = paymentDate.getFullYear();
        const startDate = new Date(paymentDate);
        
        // If payment after November 1st, membership starts next year
        if (paymentDate.getMonth() >= 10) { // 10 is November (0-based)
            startDate.setFullYear(paymentYear + 1, 0, 1); // January 1st next year
        }

        await membershipRepository.updateMembershipDetails(memberId, {
            fee_payment_year: paymentYear,
            fee_payment_date: paymentDate
        });

        const currentPeriod = await membershipRepository.getCurrentPeriod(memberId);
        if (!currentPeriod) {
            await membershipRepository.createMembershipPeriod(memberId, startDate);
        }
    },

    async updateCardDetails(
        memberId: number, 
        cardNumber?: string, 
        stampIssued?: boolean
    ): Promise<MembershipDetails> {
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

    async getMembershipDetails(memberId: number): Promise<MembershipDetails | null> {
        return membershipRepository.getMembershipDetails(memberId);
    }
};

export default membershipService;