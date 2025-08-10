import stampRepository from "../repositories/stamp.repository.js";
import membershipRepository from "../repositories/membership.repository.js";
import memberRepository from "../repositories/member.repository.js";
import auditService from "./audit.service.js";
import { DatabaseError } from "../utils/errors.js";
import { getCurrentDate } from '../utils/dateUtils.js';
import { PerformerType } from '@prisma/client';

const isDev = process.env.NODE_ENV === 'development';

const stampService = {
  async getInventoryStatus() {
    try {
      // Dohvati inventar za sve godine
      const inventory = await stampRepository.getInventory();
      return inventory.map((item) => ({
        ...item,
        remaining: item.initial_count - item.issued_count,
      }));
    } catch (_error) {
      throw new DatabaseError("Error fetching stamp inventory");
    }
  },

  async getInventoryStatusByYear(year: number) {
    try {
      const inventory = await stampRepository.getInventoryByYear(year);
      return inventory.map((item) => ({
        ...item,
        remaining: item.initial_count - item.issued_count,
      }));
    } catch (_error) {
      throw new DatabaseError(`Error fetching stamp inventory for year ${year}`);
    }
  },

  async updateInitialCount(type: string, count: number, year: number) {
    try {
      if (count < 0) {
        throw new Error("Initial count cannot be negative");
      }

      const inventory = await stampRepository.getInventoryByYear(year);
      const currentInventory = inventory.find(
        (item) => item.stamp_type === type && item.stamp_year === year
      );

      if (currentInventory && count < currentInventory.issued_count) {
        throw new Error("New count cannot be less than already issued stamps");
      }

      await stampRepository.updateInventory(type, count, year);
    } catch (error) {
      throw new DatabaseError(
        "Error updating stamp inventory: " +
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

  async issueStamp(memberId: number, type: string, forNextYear: boolean = false) {
    try {
      // Validate stamp type
      if (!type) {
        throw new Error("Stamp type is required");
      }

      // Determine which year stamp to use
      const currentYear = getCurrentDate().getFullYear();
      const stampYear = forNextYear ? currentYear + 1 : currentYear;

      // Check if stamp is available in inventory
      const inventory = await stampRepository.getInventoryByYear(stampYear);
      const stampInventory = inventory.find(
        (item) => item.stamp_type === type && item.stamp_year === stampYear
      );

      if (!stampInventory) {
        throw new Error(`No inventory found for ${type} stamps for year ${stampYear}`);
      }

      // Check if there are enough stamps
      if (stampInventory.initial_count <= stampInventory.issued_count) {
        throw new Error(`No ${type} stamps available in inventory for year ${stampYear}`);
      }

      // Issue stamp and update inventory - za odgovarajuću godinu
      await stampRepository.incrementIssuedCount(type, stampYear);
      
      // We'll handle the membership details update in the controller
      if (isDev) console.log(`Stamp issued successfully for member: ${memberId}, type: ${type}, for year: ${stampYear}`);

      return { success: true };
    } catch (error) {
      throw new DatabaseError(
        "Error issuing stamp: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  },

  async returnStamp(type: string, memberId?: number, forNextYear: boolean = false) {
    try {
      // Determine which year stamp to return
      const currentYear = getCurrentDate().getFullYear();
      const stampYear = forNextYear ? currentYear + 1 : currentYear;
      
      // Update inventory (decrement issued count)
      await stampRepository.decrementIssuedCount(type, stampYear);
      
      // We'll handle the membership details update in the controller
      if (memberId) {
        if (isDev) console.log(`Stamp returned for member: ${memberId}, type: ${type}, for year: ${stampYear}`);
      }

      return { success: true };
    } catch (error) {
      throw new DatabaseError(
        "Error returning stamp: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  },

  async issueStampToMember(memberId: number, performerId: number, forNextYear: boolean = false, performerType?: PerformerType): Promise<void> {
    try {
      const member = await memberRepository.findById(memberId);
      if (!member) {
        throw new Error("Member not found");
      }

      const stampType = this.getStampTypeFromLifeStatus(member.life_status);

      // Poziv postojeće metode za ažuriranje inventara
      await this.issueStamp(memberId, stampType, forNextYear);

      // Ažuriranje detalja članstva
      const fieldToUpdate = forNextYear
        ? 'next_year_stamp_issued'
        : 'card_stamp_issued';

      await membershipRepository.updateMembershipDetails(memberId, { 
        [fieldToUpdate]: true 
      });

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
        "Error issuing stamp to member: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  },

  async getStampHistory() {
    try {
      return await stampRepository.getStampHistory();
    } catch (error) {
      console.error("Error fetching stamp history:", error);
      throw new DatabaseError(
        "Error fetching stamp history: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  },

  async getStampHistoryByYear(year: number) {
    try {
      return await stampRepository.getStampHistoryByYear(year);
    } catch (error) {
      console.error(`Error fetching stamp history for year ${year}:`, error);
      throw new DatabaseError(
        `Error fetching stamp history for year ${year}: ` +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  },

  /**
   * Nova metoda koja samo arhivira stanje markica za određenu godinu bez resetiranja.
   * Ovo omogućuje arhiviranje stanja markica na kraju godine bez njihovog resetiranja.
   */
  async archiveStampInventory(year: number, memberId: number, notes: string = '', force: boolean = false) {
    try {
      // Provjera je li godina već arhivirana - preskačemo ovu provjeru ako je force=true
      if (!force) {
        const existingHistory = await stampRepository.getStampHistoryByYear(year);
        if (existingHistory.length > 0) {
          throw new Error(`Stamp inventory for year ${year} has already been archived`);
        }
      }

      await stampRepository.archiveStampInventory(year, memberId, notes);
      return { 
        success: true, 
        message: `Successfully archived stamp inventory for year ${year}` 
      };
    } catch (error) {
      console.error("Error during stamp inventory archiving:", error);
      throw new DatabaseError(
        "Error archiving stamp inventory: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  },

  async archiveAndResetInventory(year: number, memberId: number, notes: string = '') {
    try {
      // Ova metoda je zastarjela, samo poziva novu metodu za arhiviranje bez resetiranja
      if (isDev) console.warn("archiveAndResetInventory is deprecated, use archiveStampInventory instead");
      return await this.archiveStampInventory(year, memberId, notes);
    } catch (error) {
      console.error("Error during stamp inventory reset:", error);
      throw new DatabaseError(
        "Error resetting stamp inventory: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  },
};

export default stampService;
