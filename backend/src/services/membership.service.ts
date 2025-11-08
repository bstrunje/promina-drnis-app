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
import { getOrganizationId } from '../middleware/tenant.middleware.js';
import { Request } from 'express';
import prisma from "../utils/prisma.js";
import { Prisma } from "@prisma/client";
import { parseDate, getCurrentDate, formatDate } from '../utils/dateUtils.js';
import { updateAnnualStatistics } from './statistics.service.js';
import { PerformerType } from "@prisma/client";

const isDev = process.env.NODE_ENV === 'development';

// Definicija tipa za tijelo zahtjeva za ažuriranje članstva
interface MembershipUpdatePayload {
  paymentDate?: string;
  cardNumber?: string;
  stampIssued?: boolean;
  isRenewalPayment?: boolean;
}

const membershipService = {
  async processFeePayment(
    req: Request,
    memberId: number,
    paymentDate: Date,
    performerId?: number,
    isRenewalPayment?: boolean,
    performerType?: PerformerType
  ): Promise<Member | null> {
    try {
      const organizationId = getOrganizationId(req);
      
      // Get system settings
      const settings = await prisma.systemSettings.findFirst({
        where: { organization_id: organizationId }
      });

      const renewalStartDay = settings?.renewalStartDay || 31;
      const renewalStartMonth = settings?.renewalStartMonth || 10; // Oktober (0-based = 9)

      // Koristimo direktno Date objekt umjesto parsiranja, jer već imamo Date
      const validPaymentDate = new Date(paymentDate);
      validPaymentDate.setHours(12, 0, 0, 0); // Standardize time
      
      const member = await memberRepository.findById(organizationId, memberId);
      if (!member) {
        throw new Error("Member not found");
      }

      // VAŽNO: Koristimo getCurrentDate() (Time Traveler aware) samo za dijagnostiku i ostalu logiku,
      // ali izračun godine plaćanja temeljimo na stvarnom datumu uplate
      const currentDate = getCurrentDate();
      const currentYear = currentDate.getFullYear();

      // Bazna godina je godina iz stvarnog datuma uplate
      const paymentBaseYear = validPaymentDate.getFullYear();

      // Create cutoff date za renewal period u kontekstu godine uplate
      const cutoffDate = new Date(paymentBaseYear, renewalStartMonth - 1, renewalStartDay);
      
      // Provjeri je li ovo novi član (koji nikad nije platio članarinu)
      const isNewMember = !member.membership_details?.fee_payment_date;
      
      // Određivanje godine plaćanja:
      // - Novi član: uvijek plaća za godinu uplate
      // - Postojeći član: ako je isRenewalPayment=true ili uplata NAKON cutoff-a → sljedeća godina
      let paymentYear = paymentBaseYear;
      
      if (isRenewalPayment || (!isNewMember && validPaymentDate > cutoffDate)) {
        paymentYear = paymentBaseYear + 1;
      }

      // Dijagnostički ispis
      console.log(`[MEMBERSHIP] Processing payment for member ${memberId}:`, {
        currentDate: formatDate(currentDate),
        currentYear,
        paymentDate: formatDate(validPaymentDate),
        paymentBaseYear,
        cutoffDate: formatDate(cutoffDate),
        isNewMember,
        isRenewalPayment,
        calculatedPaymentYear: paymentYear
      });

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

        // NAPOMENA: Status 'registered' se NE postavlja automatski pri uplati!
        // Status će biti postavljen u updateCardDetails() AKO član ima i uplatu I karticu.
        // Ovo omogućuje period čekanja (pending) dok član čeka na dodjelu kartice.

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

      return await memberRepository.findById(organizationId, memberId);
    } catch (error) {
      throw new Error(
        `Error processing fee payment: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  },

  async isMembershipActive(req: Request, memberId: number): Promise<boolean> {
    const organizationId = getOrganizationId(req);
    try {
      const member = await memberRepository.findById(organizationId, memberId);
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
    req: Request,
    memberId: number
  ): Promise<MembershipDetails | undefined> {
    const organizationId = getOrganizationId(req);
    try {
      const member = await memberRepository.findById(organizationId, memberId);
      return member?.membership_details;
    } catch (error) {
      console.error("Error getting membership details:", error);
      return undefined;
    }
  },

  async updateCardDetails(req: Request, memberId: number, cardNumber: string | undefined, stampIssued: boolean | null | undefined, _performerId?: number): Promise<void> {
    try {
      const organizationId = getOrganizationId(req);
      
      // Dohvati password generation strategiju
      const settings = await prisma.systemSettings.findFirst({
        where: { organization_id: organizationId },
        select: { passwordGenerationStrategy: true }
      });
      const passwordStrategy = settings?.passwordGenerationStrategy;
      
      // Prvo dohvatimo trenutni broj kartice
      const details = await membershipRepository.getMembershipDetails(memberId);
      const previousCardNumber = details?.card_number;

      // Ako je član imao staru karticu i mijenja broj, označi staru kao potrošenu
      if (previousCardNumber && cardNumber !== undefined && previousCardNumber !== cardNumber && cardNumber.trim() !== "") {
        const cardNumberRepository = (await import('../repositories/cardnumber.repository.js')).default;
        await cardNumberRepository.markCardNumberConsumed(organizationId, previousCardNumber, memberId);
      }
      if (isDev) {
        console.log('==== MEMBERSHIP CARD UPDATE DETAILS ====');
        console.log(`Member ID: ${memberId}`);
        console.log(`Card number: "${cardNumber}"`);
        console.log(`Stamp issued: ${stampIssued}`);
      }

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
      
      if (isDev) console.log('Current member status before transaction:', member);

      await prisma.$transaction(async (tx) => {
        // 1) Ažuriraj membershipDetails (kartica/markica) prije izračuna statusa
        const membershipDetailsBefore = await tx.membershipDetails.findUnique({
          where: { member_id: memberId },
          select: {
            fee_payment_date: true,
            fee_payment_year: true,
            card_number: true,
            card_stamp_issued: true
          }
        });

        const memberExists = !!membershipDetailsBefore;
        if (isDev) {
          console.log('Membership details exist:', memberExists);
          if (memberExists) {
            console.log('Current card number:', membershipDetailsBefore?.card_number);
          }
        }

        if (!memberExists) {
          if (isDev) console.log(`Creating new membership details for member ${memberId}, card_number: ${cardNumber}, stamp_issued: FALSE (forced)`);
          await tx.membershipDetails.create({
            data: {
              member_id: memberId,
              card_number: (cardNumber ?? "").trim(),
              card_stamp_issued: false
            }
          });
        } else {
          const updateData: Prisma.MembershipDetailsUpdateInput = {};
          const trimmedCard = (cardNumber ?? "").trim();
          if (trimmedCard !== "") {
            if (isDev) console.log(`Updating card number for member ${memberId} to: ${trimmedCard}`);
            updateData.card_number = trimmedCard;
          } else {
            if (isDev) console.log(`Card number is empty or undefined, not updating card number`);
          }

          if (stampIssued !== null && stampIssued !== undefined) {
            if (isDev) console.log(`Explicitly updating stamp status for member ${memberId} to: ${stampIssued}`);
            updateData.card_stamp_issued = stampIssued;
          }

          if (Object.keys(updateData).length > 0) {
            await tx.membershipDetails.update({
              where: { member_id: memberId },
              data: updateData
            });
          }
        }

        // 2) Nakon ažuriranja, dohvatimo SVJEŽE membershipDetails i period, pa izračunamo status
        const membershipDetails = await tx.membershipDetails.findUnique({
          where: { member_id: memberId },
          select: {
            fee_payment_date: true,
            fee_payment_year: true,
            card_number: true,
            card_stamp_issued: true
          }
        });

        const activePeriod = await tx.membershipPeriod.findFirst({
          where: {
            member_id: memberId,
            end_date: null
          }
        });

        const hasPaidFee = !!membershipDetails?.fee_payment_date;
        const afterCard = (membershipDetails?.card_number ?? "").trim();
        const willHaveCard = afterCard !== "";
        const hasStamp = membershipDetails?.card_stamp_issued ?? false;
        const hasActivePeriod = !!activePeriod;

        const isRandom8Strategy = passwordStrategy === 'RANDOM_8';
        let shouldBeRegistered = false;

        if (isRandom8Strategy) {
          shouldBeRegistered = hasPaidFee && hasStamp && hasActivePeriod;
          if (isDev) console.log(`[RANDOM_8] Member ${memberId} - hasPaidFee: ${hasPaidFee}, hasStamp: ${hasStamp}, hasActivePeriod: ${hasActivePeriod}`);
        } else {
          shouldBeRegistered = willHaveCard && hasPaidFee && hasStamp && hasActivePeriod;
          if (isDev) console.log(`[${passwordStrategy || 'DEFAULT'}] Member ${memberId} - willHaveCard: ${willHaveCard}, hasPaidFee: ${hasPaidFee}, hasStamp: ${hasStamp}, hasActivePeriod: ${hasActivePeriod}`);
        }

        if (shouldBeRegistered) {
          if (isDev) console.log(`Updating member ${memberId} to: registered, registration_completed = true`);
          await tx.member.update({
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
        } else {
          if (isDev) console.log(`Member ${memberId} not ready - setting status 'pending', registration_completed = false`);
          await tx.member.update({
            where: { member_id: memberId },
            data: {
              status: 'pending',
              registration_completed: false
            }
          });
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
    req: Request,
    memberId: number,
    periods: MembershipPeriod[],
    performerId?: number,
    updateMemberStatus: boolean = false,
    performerType?: PerformerType
  ): Promise<void> {
    const organizationId = getOrganizationId(req);
    try {
      const member = await memberRepository.findById(organizationId, memberId);
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
    req: Request,
    memberId: number,
    payload: MembershipUpdatePayload,
    performerId?: number,
    performerType?: PerformerType
  ): Promise<Member | null> {
    const { paymentDate, cardNumber, stampIssued, isRenewalPayment } = payload;

    if (paymentDate) {
      await this.processFeePayment(
        req,
        memberId,
        parseDate(paymentDate),
        performerId,
        isRenewalPayment,
        performerType
      );
      
      // Nakon uplate, UVIJEK provjeri i ažuriraj status člana
      // (potrebno za reset registration_completed ako nema karticu)
      if (typeof cardNumber === 'undefined' && typeof stampIssued === 'undefined') {
        // Dohvati trenutne vrijednosti ako nisu proslijeđene
        const details = await membershipRepository.getMembershipDetails(memberId);
        await this.updateCardDetails(req, memberId, details?.card_number, details?.card_stamp_issued, performerId);
      } else {
        await this.updateCardDetails(req, memberId, cardNumber, stampIssued, performerId);
      }
    } else if (typeof cardNumber !== 'undefined' || typeof stampIssued !== 'undefined') {
      // Ako nema uplate ali ima promjena kartice/markice
      await this.updateCardDetails(req, memberId, cardNumber, stampIssued, performerId);
    }

    const organizationId = getOrganizationId(req);
    return memberRepository.findById(organizationId, memberId);
  },

  async terminateMembership(
    req: Request,
    memberId: number,
    reason: MembershipEndReason,
    endDateStr?: string,
    performerId?: number,
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

        const organizationId = getOrganizationId(req);
        const details = await membershipRepository.getMembershipDetails(memberId);
        if (details?.card_number) {
            const cardNumberRepository = (await import('../repositories/cardnumber.repository.js')).default;
            await cardNumberRepository.markCardNumberConsumed(organizationId, details.card_number, memberId);
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
    req: Request,
    memberId: number,
    periodId: number,
    endReason: MembershipEndReason,
    performerId?: number,
    performerType?: PerformerType
  ): Promise<void> {
    const organizationId = getOrganizationId(req);
    try {
      const member = await memberRepository.findById(organizationId, memberId);
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

  async checkAutoTerminations(organizationId?: number): Promise<void> {
    try {
      const currentYear = getCurrentDate().getFullYear();
      const currentDate = getCurrentDate();
      
      console.log(`🔧 [AUTO-TERMINATION] Pokretanje provjere - currentDate: ${formatDate(currentDate)}, currentYear: ${currentYear}`);

      // Ako organizationId nije proslijeđen, obradi sve organizacije
      if (!organizationId) {
        const allOrganizations = await prisma.organization.findMany({ where: { is_active: true } });
        for (const org of allOrganizations) {
          await this.checkAutoTerminations(org.id);
        }
        return;
      }

      // Dohvati postavke sustava za specifičnu organizaciju
      const settings = await prisma.systemSettings.findFirst({
        where: { organization_id: organizationId }
      });

      // Koristi postavke ili zadane vrijednosti (1. ožujak kao default)
      const terminationDay = settings?.membershipTerminationDay ?? 1;
      const terminationMonth = settings?.membershipTerminationMonth ?? 3;

      // RETROAKTIVNA AUTO-TERMINACIJA: Provjeri sve propuštene godine
      // Pronađi najstariji membership period za ovu organizaciju
      const oldestMember = await prisma.member.findFirst({
        where: { 
          organization_id: organizationId,
          periods: { some: {} } // Ima barem jedan period
        },
        select: {
          periods: {
            orderBy: { start_date: 'asc' },
            take: 1,
            select: { start_date: true }
          }
        }
      });
      
      const startYear = oldestMember?.periods[0]?.start_date
        ? new Date(oldestMember.periods[0].start_date).getFullYear()
        : currentYear - 5; // Fallback: 5 godina unazad
      
      console.log(`🔧 [AUTO-TERMINATION] Provjeravam godine od ${startYear} do ${currentYear}`);
      
      for (let year = startYear; year <= currentYear; year++) {
        // Definiramo rok za završetak članstva za tu godinu
        const renewalDeadline = new Date(year, terminationMonth - 1, terminationDay);
        
        // Provjeri je li prošao grace period za tu godinu
        if (currentDate > renewalDeadline) {
          console.log(`🔧 [AUTO-TERMINATION] Retroaktivna provjera za godinu ${year}, org ${organizationId}`);
          await membershipRepository.endExpiredMemberships(year, organizationId);
        }
      }

      console.log(`🔧 [AUTO-TERMINATION] ✅ Završena provjera za organizaciju ${organizationId}`);
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
