// src/services/membership.service.ts
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
import { Prisma } from "@prisma/client";
import { parseDate, getCurrentDate, formatDate } from '../utils/dateUtils.js';
import { updateAnnualStatistics } from './statistics.service.js';
import { PerformerType } from "@prisma/client";

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
    performerId?: number,
    isRenewalPayment?: boolean,
    performerType?: PerformerType
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

      // Ako je renewal payment, koristimo sljedeću godinu, inače godinu iz datuma
      const paymentYear = isRenewalPayment ? paymentDate.getFullYear() + 1 : paymentDate.getFullYear();


      // Create cutoff date (October 31st of current year)
      const cutoffDate = new Date(paymentYear, 9, renewalStartDay); // Month 9 is October


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

      } else if (validPaymentDate > cutoffDate && isNewMember) {
        console.log(`Payment after cutoff date for NEW member - still counting for current year`);
        // Za nove članove ne mijenjamo godinu, čak i ako je kasno u godini
      }

      await prisma.$transaction(async (tx) => {
        console.log(`[MEMBERSHIP] Počinje transakcija za uplatu članarine člana ${memberId}`);
        
        // Update membership details
        await tx.membershipDetails.upsert({
          where: { member_id: memberId },
          update: {
            fee_payment_year: paymentYear,
            fee_payment_date: validPaymentDate,
          },
          create: {
            member_id: memberId,
            fee_payment_year: paymentYear,
            fee_payment_date: validPaymentDate,
          }
        });
        console.log(`[MEMBERSHIP] Ažurirani detalji članstva za člana ${memberId}`);

        // Automatski postaviti status člana na "registered" kad plati članarinu
        await tx.member.update({
          where: { member_id: memberId },
          data: { status: 'registered' }
        });
        console.log(`[MEMBERSHIP] Status člana ${memberId} postavljen na "registered" nakon plaćanja članarine`);

        // Check current period using Prisma
        const currentPeriod = await tx.membershipPeriod.findFirst({
          where: {
            member_id: memberId,
            end_date: null
          },
          orderBy: { start_date: 'desc' }
        });

        // Handle period management
        if (!currentPeriod) {
          await tx.membershipPeriod.create({
            data: {
              member_id: memberId,
              start_date: validPaymentDate
            }
          });
          console.log(`[MEMBERSHIP] Kreiran novi period članstva za člana ${memberId}`);
        } else if (currentPeriod.end_reason === "non_payment") {
          // End current period
          await tx.membershipPeriod.update({
            where: { period_id: currentPeriod.period_id },
            data: {
              end_date: getCurrentDate(),
              end_reason: "non_payment"
            }
          });
          // Create new period
          await tx.membershipPeriod.create({
            data: {
              member_id: memberId,
              start_date: validPaymentDate
            }
          });
          console.log(`[MEMBERSHIP] Završen stari i kreiran novi period za člana ${memberId}`);
        }
        
        console.log(`[MEMBERSHIP] Transakcija uspješno završena za člana ${memberId}`);
      });

      if (performerId) {
        await auditService.logAction(
          "MEMBERSHIP_FEE_PAYMENT",
          performerId,
          `Membership fee paid for ${paymentYear}`,
          undefined,
          "success",
          memberId,
          performerType
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

  async updateCardDetails(memberId: number, cardNumber: string | undefined, stampIssued: boolean | null | undefined, _performerId?: number): Promise<void> {
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

      const member = await prisma.member.findUnique({
        where: { member_id: memberId },
        select: {
          status: true,
          registration_completed: true
        }
      });
      
      if (!member) {
        throw new Error(`Member with ID ${memberId} not found`);
      }
      
      console.log('Current member status before transaction:', member);

      await prisma.$transaction(async (tx) => {
        // Prvo ažuriramo status člana na 'registered' i registration_completed na true
        // ako je dodijeljen broj kartice (preslikavamo ponašanje iz updateMemberWithCardAndPassword)
        // VAŽNO: Provjeravamo da li je cardNumber stvarno dodijeljen (nije prazan string)
        if (cardNumber !== undefined && cardNumber !== null && cardNumber.trim() !== "") {
          console.log(`Updating member status for member ${memberId} to: registered and registration_completed: true`);
          
          // OPTIMIZACIJA: Prisma update umjesto client.query
          const updateResult = await tx.member.update({
            where: { member_id: memberId },
            data: {
              status: 'registered',
              registration_completed: true
            },
            select: {
              member_id: true,
              status: true,
              registration_completed: true
            }
          });
          
          console.log('Member status update result:', updateResult);
        } else {
          console.log(`Card number is empty or undefined, not updating member status`);
        }
        
        // OPTIMIZACIJA: Prisma findUnique umjesto client.query
        const existingMembershipDetails = await tx.membershipDetails.findUnique({
          where: { member_id: memberId },
          select: {
            member_id: true,
            card_number: true
          }
        });

        const memberExists = !!existingMembershipDetails;
        console.log('Membership details exist:', memberExists);
        if (memberExists) {
          console.log('Current card number:', existingMembershipDetails.card_number);
        }
        
        // Zatim ažuriramo broj članske iskaznice
        if (!memberExists) {
          // OPTIMIZACIJA: Prisma create umjesto INSERT
          console.log(`Creating new membership details for member ${memberId}, card_number: ${cardNumber}, stamp_issued: FALSE (forced)`);
          await tx.membershipDetails.create({
            data: {
              member_id: memberId,
              card_number: cardNumber || "",
              card_stamp_issued: false
            }
          });
        } else {
          // Pripremi podatke za update
          const updateData: Prisma.MembershipDetailsUpdateInput = {};
          
          // Ako je proslijeden broj kartice, ažuriramo ga
          if (cardNumber !== undefined && cardNumber !== null && cardNumber.trim() !== "") {
            console.log(`Updating card number for member ${memberId} to: ${cardNumber}`);
            updateData.card_number = cardNumber.trim();
          } else {
            console.log(`Card number is empty or undefined, not updating card number`);
          }

          // Ako je proslijeden status markice, ažuriramo ga
          if (stampIssued !== null && stampIssued !== undefined) {
            console.log(`Explicitly updating stamp status for member ${memberId} to: ${stampIssued}`);
            updateData.card_stamp_issued = stampIssued;
          }
          
          // OPTIMIZACIJA: Prisma update umjesto UPDATE query
          if (Object.keys(updateData).length > 0) {
            await tx.membershipDetails.update({
              where: { member_id: memberId },
              data: updateData
            });
          }
        }
        
        // OPTIMIZACIJA: Prisma deleteMany umjesto DELETE query
        if (cardNumber !== undefined && cardNumber !== null && cardNumber.trim() !== "") {
          await tx.password_update_queue.deleteMany({
            where: {
              member_id: memberId,
              card_number: { not: cardNumber.trim() }
            }
          });
          
          console.log('Card number updated successfully');
        }
        
        // OPTIMIZACIJA: Prisma findUnique umjesto SELECT query
        const memberAfterUpdate = await tx.member.findUnique({
          where: { member_id: memberId },
          select: {
            member_id: true,
            full_name: true,
            status: true,
            registration_completed: true
          }
        });
        
        console.log('Member after all updates:', memberAfterUpdate);
      });
    } catch (error) {
      console.error('Error updating card details:', error);
      throw new Error(`Failed to update card details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async updateMembershipHistory(
    memberId: number,
    periods: MembershipPeriod[],
    performerId?: number,
    updateMemberStatus: boolean = false,
    performerType?: PerformerType
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
          
          if (performerId) {
            await auditService.logAction(
              "UPDATE_MEMBER_HISTORY",
              performerId,
              `Updated membership history for member ${memberId}`,
              undefined,
              "success",
              memberId,
              performerType
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
    performerId?: number,
    performerType?: PerformerType
  ): Promise<Member | null> {
    const { paymentDate, cardNumber, stampIssued, isRenewalPayment } = payload;

    if (paymentDate) {
      await this.processFeePayment(
        memberId,
        parseDate(paymentDate),
        performerId,
        isRenewalPayment,
        performerType
      );
    }

    if (typeof cardNumber !== 'undefined' || typeof stampIssued !== 'undefined') {
        await this.updateCardDetails(memberId, cardNumber, stampIssued, performerId);
    }

    return memberRepository.findById(memberId);
  },

  async terminateMembership(
    memberId: number,
    reason: MembershipEndReason,
    performerId?: number,
    endDateStr?: string,
    performerType?: PerformerType
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

        if (performerId) {
          await auditService.logAction(
            'TERMINATE_MEMBERSHIP',
            performerId,
            `Terminated membership for member ${memberId} with reason: ${reason}`,
            undefined,
            'success',
            memberId,
            performerType
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
    performerId?: number,
    performerType?: PerformerType
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

      if (performerId) {
        await auditService.logAction(
          'UPDATE_MEMBERSHIP_END_REASON',
          performerId,
          `Updated end reason for period ${periodId} for member ${memberId}`,
          undefined,
          'success',
          memberId,
          performerType
        );
      }
    } catch (error) {
      console.error("Error updating membership period end reason:", error);
      throw error;
    }
  },


  async getMembershipHistory(memberId: number, _req?: Request): Promise<{
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
      
      console.log(`🔧 [AUTO-TERMINATION] Pokretanje provjere - currentDate: ${formatDate(currentDate)}, currentYear: ${currentYear}`);

      // Dohvati postavke sustava
      const _settings = await prisma.systemSettings.findFirst({
        where: { id: "default" },
      });

      // Koristi postavke ili zadane vrijednosti


      // Definiramo rok za obnovu članstva (1. ožujak tekuće godine)
      const renewalDeadline = new Date(currentYear, 2, 1); // Mjesec 2 je ožujak

      console.log(`🔧 [AUTO-TERMINATION] Usporedba datuma:`);
      console.log(`🔧 [AUTO-TERMINATION] - currentDate: ${formatDate(currentDate)} (${currentDate.getTime()})`);
      console.log(`🔧 [AUTO-TERMINATION] - currentYear: ${currentYear}`);
      console.log(`🔧 [AUTO-TERMINATION] - renewalDeadline: ${formatDate(renewalDeadline)} (${renewalDeadline.getTime()})`);
      console.log(`🔧 [AUTO-TERMINATION] - currentDate > renewalDeadline: ${currentDate > renewalDeadline}`);

      // Ako je trenutni datum nakon roka za obnovu, provjeri i završi sva članstva koja nisu obnovljena
      if (currentDate > renewalDeadline) {
        console.log(`🔧 [AUTO-TERMINATION] POZIVAM endExpiredMemberships za godinu ${currentYear}`);
        await membershipRepository.endExpiredMemberships(currentYear);
      } else {
        console.log(`🔧 [AUTO-TERMINATION] PRESKAČEM provjeru - datum je prije roka`);
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
