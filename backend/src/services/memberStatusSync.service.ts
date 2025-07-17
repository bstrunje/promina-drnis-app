// backend/src/services/memberStatusSync.service.ts
import prisma from "../utils/prisma.js";
import db from "../utils/db.js";
import { Request } from "express";
import auditService from "./audit.service.js";

/**
 * Servis za sinkronizaciju statusa članova
 * Osigurava da svi članovi koji imaju broj iskaznice imaju status "registered" i registration_completed=true
 */
const memberStatusSyncService = {
  /**
   * Sinkronizira statuse članova na temelju postojanja broja iskaznice.
   * @param req - Express Request objekt (opcionalno za audit log)
   * @returns Broj ažuriranih članova
   */
  async syncMemberStatuses(req?: Request): Promise<{ updatedCount: number }> {
    try {
      console.log("Započinjem sinkronizaciju statusa članova...");

      const membersToUpdate = await prisma.member.findMany({
        where: {
          OR: [
            { status: { not: 'registered' } },
            { registration_completed: false },
          ],
          membership_details: {
            AND: [
              { card_number: { not: '' } },
              { card_number: { not: null } },
            ],
          },
          role: { not: 'member_superuser' },
        },
        select: {
          member_id: true,
          full_name: true,
          status: true,
          registration_completed: true,
        },
      });

      if (membersToUpdate.length === 0) {
        console.log("Nema članova za ažuriranje statusa.");
        return { updatedCount: 0 };
      }

      console.log(`Pronađeno ${membersToUpdate.length} članova za ažuriranje statusa.`);

      for (const member of membersToUpdate) {
        await prisma.member.update({
          where: { member_id: member.member_id },
          data: {
            status: 'registered',
            registration_completed: true,
          },
        });

        if (req) {
          await auditService.logAction(
            'member_status_sync',
            req.user?.id || null,
            `Status člana ${member.full_name} sinkroniziran na 'registered'.`,
            req,
            'success',
            member.member_id,
            req.user?.performer_type
          );
        }
      }

      console.log(`Uspješno ažurirano ${membersToUpdate.length} članova.`);
      return { updatedCount: membersToUpdate.length };
    } catch (error) {
      console.error("Greška pri sinkronizaciji statusa članova:", error);
      throw new Error(`Greška pri sinkronizaciji statusa članova: ${error instanceof Error ? error.message : 'Nepoznata greška'}`);
    }
  },

  /**
   * Sinkronizira članove kojima je istekla članarina i postavlja ih kao neaktivne.
   * @param req - Express Request objekt (opcionalno za audit log)
   */
  async syncInactiveMembers(req?: Request): Promise<{ updatedCount: number }> {
    try {
      console.log('Započinjem sinkronizaciju neaktivnih članova...');
      const currentYear = new Date().getFullYear();

      // 1. Dohvati sistemske postavke za cutoff datum
      const settings = await prisma.systemSettings.findUnique({ where: { id: 'default' } });
      const renewalStartMonth = settings?.renewalStartMonth ?? 11; // Default: Studeni
      const renewalStartDay = settings?.renewalStartDay ?? 1;   // Default: 1.

      // 2. Pronađi sve članove koji bi trebali biti neaktivni.
      const allActiveMembers = await prisma.member.findMany({
        where: {
          status: { in: ['registered', 'active'] },
          role: { notIn: ['member_superuser', 'member_administrator'] },
          periods: { some: { end_date: null } },
        },
        include: {
          membership_details: true,
          periods: { orderBy: { start_date: 'asc' } }, // Trebamo sve periode, prvi da vidimo je li novi
        },
      });

      const membersToDeactivate = allActiveMembers.filter(member => {
        const details = member.membership_details;
        if (!details || !details.fee_payment_year || !details.fee_payment_date) {
          // Ako nema detalja ili datuma uplate, a kreiran je prije ove godine, neaktivan je.
          return new Date(member.created_at || 0).getFullYear() < currentYear;
        }

        const paymentYear = details.fee_payment_year;
        const paymentDate = new Date(details.fee_payment_date);

        // Odredi je li član bio 'novi' u trenutku zadnje uplate
        // Ako je imao samo jedan period i on odgovara zadnjoj uplati, bio je novi.
        const isNewAtTimeOfPayment = member.periods.length === 1 && new Date(member.periods[0].start_date).getFullYear() === paymentYear;

        const cutoffDate = new Date(paymentYear, renewalStartMonth - 1, renewalStartDay);
        const paidAfterCutoff = paymentDate > cutoffDate;

        let effectiveMembershipYear = paymentYear;
        if (paidAfterCutoff && !isNewAtTimeOfPayment) {
          effectiveMembershipYear = paymentYear + 1;
        }

        // Članstvo vrijedi za cijelu godinu NAKON 'effectiveMembershipYear'
        // Ako je ta godina isteka prije TRENUTNE godine, član je neaktivan.
        const expiryYear = effectiveMembershipYear + 1;
        return expiryYear < currentYear;
      });

      if (membersToDeactivate.length === 0) {
        console.log('Nema članova za postavljanje kao neaktivne.');
        return { updatedCount: 0 };
      }

      console.log(`Pronađeno ${membersToDeactivate.length} članova za postavljanje kao neaktivne.`);

      // 3. Ažuriraj pronađene članove i njihove periode.
      for (const member of membersToDeactivate) {
        await prisma.$transaction(async (tx) => {
          await tx.member.update({
            where: { member_id: member.member_id },
            data: { status: 'inactive' },
          });

          const openPeriods = await tx.membershipPeriod.findMany({
            where: { member_id: member.member_id, end_date: null },
          });

          for (const period of openPeriods) {
            const periodYear = new Date(period.start_date).getFullYear();
            await tx.membershipPeriod.update({
              where: { period_id: period.period_id },
              data: {
                end_date: new Date(`${periodYear}-12-31T23:59:59.000Z`),
                end_reason: 'non_payment',
              },
            });
          }

          if (req) {
            await auditService.logAction('member_status_sync_inactive', req.user?.id || null, `Član ${member.full_name} postavljen kao neaktivan zbog isteka članarine.`, req, 'success', member.member_id, req.user?.performer_type);
          }
        });
        console.log(`Član ${member.full_name} (ID: ${member.member_id}) postavljen kao neaktivan.`);
      }

      return { updatedCount: membersToDeactivate.length };

    } catch (error) {
      console.error('Greška pri sinkronizaciji neaktivnih članova:', error);
      throw new Error(`Greška pri sinkronizaciji neaktivnih članova: ${error instanceof Error ? error.message : 'Nepoznata greška'}`);
    }
  },

  /**
   * Pokreće obje sinkronizacije i vraća kombinirane rezultate.
   * @param req - Express Request objekt (opcionalno)
   * @returns Rezultat sinkronizacije
   */
  async runSync(req?: Request): Promise<{ success: boolean; message: string; updatedCount: number; inactiveUpdatedCount: number }> {
    try {
      const { updatedCount } = await this.syncMemberStatuses(req);
      const { updatedCount: inactiveUpdatedCount } = await this.syncInactiveMembers(req);
      return {
        success: true,
        message: `Sinkronizacija uspješno završena. Ažurirano ${updatedCount} statusa i ${inactiveUpdatedCount} neaktivnih članova.`,
        updatedCount,
        inactiveUpdatedCount,
      };
    } catch (error) {
      return {
        success: false,
        message: `Greška pri sinkronizaciji: ${error instanceof Error ? error.message : 'Nepoznata greška'}`,
        updatedCount: 0,
        inactiveUpdatedCount: 0,
      };
    }
  },
};

export default memberStatusSyncService;
