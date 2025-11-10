import stampRepository from "../repositories/stamp.repository.js";
import membershipRepository from "../repositories/membership.repository.js";
import memberRepository from "../repositories/member.repository.js";
import membershipService from "./membership.service.js";
import auditService from "./audit.service.js";
import { DatabaseError } from '../utils/errors.js';
import { tOrDefault } from '../utils/i18n.js';
import { getOrganizationId } from '../middleware/tenant.middleware.js';
import { Request } from 'express';
import { getCurrentDate } from '../utils/dateUtils.js';
import { PerformerType } from '@prisma/client';
import prisma from '../utils/prisma.js';
const isDev = process.env.NODE_ENV === 'development';

const stampService = {
  async getInventoryStatus(req: Request) {
    try {
      const organizationId = getOrganizationId(req);
      // Dohvati inventar za sve godine
      const inventory = await stampRepository.getInventory(organizationId);
      return inventory.map((item) => ({
        ...item,
        remaining: item.initial_count - item.issued_count,
      }));
    } catch (_error) {
      throw new DatabaseError(tOrDefault('stamp.errors.FETCH_INVENTORY', 'hr', 'Error fetching stamp inventory'));
    }
  },

  async getInventoryStatusByYear(req: Request, year: number) {
    try {
      const organizationId = getOrganizationId(req);
      const inventory = await stampRepository.getInventoryByYear(organizationId, year);
      return inventory.map((item) => ({
        ...item,
        remaining: item.initial_count - item.issued_count,
      }));
    } catch (_error) {
      throw new DatabaseError(tOrDefault('stamp.errors.FETCH_INVENTORY_YEAR', 'hr', 'Error fetching stamp inventory for year {{year}}', { year: year.toString() }));
    }
  },

  async updateInitialCount(req: Request, type: string, count: number, year: number) {
    try {
      if (isDev) console.log(`[STAMP-SERVICE] Ažuriram početni broj markica: ${type}, godina ${year}, broj ${count}`);
      
      const organizationId = getOrganizationId(req);
      // Pozovi repository metodu
      await stampRepository.updateInventory(organizationId, type, count, year);
      const inventory = await stampRepository.getInventoryByYear(organizationId, year);
      const currentInventory = inventory.find(
        (item) => item.stamp_type === type && item.stamp_year === year
      );

      if (currentInventory && count < currentInventory.issued_count) {
        throw new Error(tOrDefault('stamp.errors.COUNT_BELOW_ISSUED', 'hr', 'New count cannot be less than already issued stamps'));
      }

      // Već pozvan iznad
    } catch (error) {
      throw new DatabaseError(
        tOrDefault('stamp.errors.UPDATE_INVENTORY', 'hr', 'Error updating stamp inventory') + ': ' +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  },

  // Helper function to safely map life status to stamp type
  getStampTypeFromLifeStatus(lifeStatus: string | undefined): string {
    if (!lifeStatus) {
      return "employed"; // Default if missing
    }

    switch (lifeStatus) {
      case "employed/unemployed":
        return "employed";
      case "child/pupil/student":
        return "student";
      case "pensioner":
        return "pensioner";
      default:
        return "employed"; // Default fallback
    }
  },

  async issueStamp(req: Request, memberId: number, type: string, forNextYear: boolean = false) {
    try {
      // Validate stamp type
      if (!type) {
        throw new Error(tOrDefault('stamp.errors.STAMP_TYPE_REQUIRED', 'hr', 'Stamp type is required'));
      }

      const organizationId = getOrganizationId(req);
      
      // Determine which year stamp to use
      const currentYear = getCurrentDate().getFullYear();
      const stampYear = forNextYear ? currentYear + 1 : currentYear;

      // Check if stamp is available in inventory
      const inventory = await stampRepository.getInventoryByYear(organizationId, stampYear);
      const stampInventory = inventory.find(
        (item) => item.stamp_type === type && item.stamp_year === stampYear
      );

      if (!stampInventory) {
        throw new Error(tOrDefault('stamp.errors.NO_INVENTORY', 'hr', 'No inventory found for {{type}} stamps for year {{year}}', { type, year: stampYear.toString() }));
      }

      // Check if there are enough stamps
      if (stampInventory.initial_count <= stampInventory.issued_count) {
        throw new Error(tOrDefault('stamp.errors.NO_STAMPS_AVAILABLE', 'hr', 'No {{type}} stamps available in inventory for year {{year}}', { type, year: stampYear.toString() }));
      }

      // Issue stamp and update inventory - za odgovarajuću godinu
      await stampRepository.incrementIssuedCount(organizationId, type, stampYear);
      
      // We'll handle the membership details update in the controller
      if (isDev) console.log(tOrDefault('stamp.success.STAMP_ISSUED', 'hr', 'Stamp issued successfully for member {{memberId}}, type: {{type}}, for year: {{year}}', { memberId: memberId.toString(), type, year: stampYear.toString() }));

      return { success: true };
    } catch (error) {
      throw new DatabaseError(
        tOrDefault('stamp.errors.ISSUE_STAMP', 'hr', 'Error issuing stamp') + ': ' +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  },

  async returnStamp(req: Request, type: string, memberId?: number, forNextYear: boolean = false) {
    try {
      // Determine which year stamp to return
      const currentYear = getCurrentDate().getFullYear();
      const stampYear = forNextYear ? currentYear + 1 : currentYear;
      const organizationId = getOrganizationId(req);
      
      // Update inventory (decrement issued count)
      await stampRepository.decrementIssuedCount(organizationId, type, stampYear);
      
      // We'll handle the membership details update in the controller
      if (memberId) {
        if (isDev) console.log(tOrDefault('stamp.success.STAMP_RETURNED', 'hr', 'Stamp returned for member {{memberId}}, type: {{type}}, for year: {{year}}', { memberId: memberId.toString(), type, year: stampYear.toString() }));
      }

      return { success: true };
    } catch (error) {
      throw new DatabaseError(
        tOrDefault('stamp.errors.RETURN_STAMP', 'hr', 'Error returning stamp') + ': ' +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  },

  async issueStampToMember(req: Request, memberId: number, performerId: number, forNextYear: boolean = false, performerType?: PerformerType): Promise<void> {
    const organizationId = getOrganizationId(req);
    try {
      const member = await memberRepository.findById(organizationId, memberId);
      if (!member) {
        throw new Error(tOrDefault('stamp.errors.MEMBER_NOT_FOUND', 'hr', 'Member not found'));
      }

      // KRITIČNO: Član mora imati dodijeljenu člansku iskaznicu prije izdavanja markice
      if (!member.membership_details?.card_number) {
        throw new Error(tOrDefault('stamp.errors.CARD_NUMBER_REQUIRED', 'hr', 'Member must have a card number assigned before issuing a stamp'));
      }

      const stampType = stampService.getStampTypeFromLifeStatus(member.life_status);

      // Poziv postojeće metode za ažuriranje inventara
      await stampService.issueStamp(req, memberId, stampType, forNextYear);

      // Ažuriranje detalja članstva
      const fieldToUpdate = forNextYear
        ? 'next_year_stamp_issued'
        : 'card_stamp_issued';

      await membershipRepository.updateMembershipDetails(memberId, { 
        [fieldToUpdate]: true 
      });

      // Re-kalkuliraj registration_completed za tekuću godinu
      if (!forNextYear) {
        const currentCard = member.membership_details?.card_number ?? null;
        await membershipService.updateCardDetails(
          req,
          memberId,
          currentCard || undefined,
          true,
          performerId
        );
      }

      // Logiranje akcije
      const stampYear = forNextYear ? getCurrentDate().getFullYear() + 1 : getCurrentDate().getFullYear();
      await auditService.logAction(
        'ISSUE_STAMP',
        performerId,
        `Issued ${stampType} stamp to member ${memberId} for year ${stampYear}`,
        undefined,
        'success',
        memberId,
        performerType
      );
    } catch (error) {
      throw new DatabaseError(
        tOrDefault('stamp.errors.ISSUE_STAMP_TO_MEMBER', 'hr', 'Error issuing stamp to member') + ': ' +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  },

  async getStampHistory(req: Request) {
    try {
      const organizationId = getOrganizationId(req);
      return await stampRepository.getStampHistory(organizationId);
    } catch (error) {
      console.error(tOrDefault('stamp.errors.FETCH_HISTORY', 'hr', 'Error fetching stamp history'), error);
      throw new DatabaseError(
        tOrDefault('stamp.errors.FETCH_HISTORY', 'hr', 'Error fetching stamp history') + ': ' +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  },

  async getStampHistoryByYear(req: Request, year: number) {
    try {
      const organizationId = getOrganizationId(req);
      return await stampRepository.getStampHistoryByYear(organizationId, year);
    } catch (error) {
      console.error(tOrDefault('stamp.errors.FETCH_HISTORY_YEAR', 'hr', 'Error fetching stamp history for year {{year}}', { year: year.toString() }), error);
      throw new DatabaseError(
        tOrDefault('stamp.errors.FETCH_HISTORY_YEAR', 'hr', 'Error fetching stamp history for year {{year}}', { year: year.toString() }) + ': ' +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  },

  /**
   * Nova metoda koja samo arhivira stanje markica za određenu godinu bez resetiranja.
   * Ovo omogućuje arhiviranje stanja markica na kraju godine bez njihovog resetiranja.
   */
  async archiveStampInventory(req: Request, year: number, memberId: number, notes: string = '', force: boolean = false) {
    try {
      const organizationId = getOrganizationId(req);
      // Provjera je li godina već arhivirana - preskačemo ovu provjeru ako je force=true
      if (!force) {
        const existingHistory = await stampRepository.getStampHistoryByYear(organizationId, year);
        if (existingHistory.length > 0) {
          throw new Error(tOrDefault('stamp.errors.ALREADY_ARCHIVED', 'hr', 'Stamp inventory for year {{year}} has already been archived', { year: year.toString() }));
        }
      }

      await stampRepository.archiveStampInventory(organizationId, year, memberId, notes);
      return { 
        success: true, 
        message: tOrDefault('stamp.success.INVENTORY_ARCHIVED', 'hr', 'Successfully archived stamp inventory for year {{year}}', { year: year.toString() })
      };
    } catch (error) {
      console.error(tOrDefault('stamp.errors.ARCHIVE_INVENTORY', 'hr', 'Error archiving stamp inventory'), error);
      throw new DatabaseError(
        tOrDefault('stamp.errors.ARCHIVE_INVENTORY', 'hr', 'Error archiving stamp inventory') + ': ' +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  },

  async archiveAndResetInventory(req: Request, year: number, memberId: number, notes: string = '') {
    try {
      // Ova metoda je zastarjela, samo poziva novu metodu za arhiviranje bez resetiranja
      if (isDev) console.warn("archiveAndResetInventory is deprecated, use archiveStampInventory instead");
      return await this.archiveStampInventory(req, year, memberId, notes);
    } catch (error) {
      console.error(tOrDefault('stamp.errors.RESET_INVENTORY', 'hr', 'Error resetting stamp inventory'), error);
      throw new DatabaseError(
        tOrDefault('stamp.errors.RESET_INVENTORY', 'hr', 'Error resetting stamp inventory') + ': ' +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  },

  async getMembersWithStamp(req: Request, stampType: string, year: number) {
    try {
      // Mapiranje stamp tipova na life_status vrijednosti
      const lifeStatusMap: { [key: string]: string } = {
        'employed': 'employed/unemployed',
        'student': 'child/pupil/student', 
        'pensioner': 'pensioner'
      };

      const targetLifeStatus = lifeStatusMap[stampType];
      if (!targetLifeStatus) {
        throw new Error(tOrDefault('stamp.errors.INVALID_STAMP_TYPE', 'hr', 'Invalid stamp type: {{type}}', { type: stampType }));
      }

      // Dohvati članove s izdanim markicama za određeni tip i godinu
      const currentYear = getCurrentDate().getFullYear();
      const isCurrentYear = year === currentYear;
      
      const organizationId = getOrganizationId(req);
      const members = await prisma.member.findMany({
        where: {
          organization_id: organizationId,
          life_status: targetLifeStatus,
          membership_details: {
            // Za trenutnu godinu provjeri card_stamp_issued, za sljedeću next_year_stamp_issued
            [isCurrentYear ? 'card_stamp_issued' : 'next_year_stamp_issued']: true
          }
        },
        include: {
          membership_details: {
            select: {
              card_stamp_issued: true,
              next_year_stamp_issued: true,
              card_number: true
            }
          }
        },
        orderBy: [
          { last_name: 'asc' },
          { first_name: 'asc' }
        ]
      });

      // Mapiranje rezultata u format koji frontend očekuje
      return members.map((member) => ({
        id: member.member_id,
        first_name: member.first_name,
        last_name: member.last_name,
        card_number: member.membership_details?.card_number || null,
        stamp_issued: isCurrentYear 
          ? member.membership_details?.card_stamp_issued 
          : member.membership_details?.next_year_stamp_issued
      }));

    } catch (error) {
      throw new DatabaseError(
        tOrDefault('stamp.errors.FETCH_MEMBERS_WITH_STAMPS', 'hr', 'Error fetching members with stamps') + ': ' +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  },
};

export default stampService;
