import stampRepository from "../repositories/stamp.repository.js";
import membershipRepository from "../repositories/membership.repository.js";
import { DatabaseError } from "../utils/errors.js";

const stampService = {
  async getInventoryStatus() {
    try {
      // Dohvati inventar za sve godine
      const inventory = await stampRepository.getInventory();
      return inventory.map((item) => ({
        ...item,
        remaining: item.initial_count - item.issued_count,
      }));
    } catch (error) {
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
    } catch (error) {
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
  getStampTypeFromLifeStatus(lifeStatus: string): string {
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
      const currentYear = new Date().getFullYear();
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
      console.log(`Stamp issued successfully for member: ${memberId}, type: ${type}, for year: ${stampYear}`);

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
      const currentYear = new Date().getFullYear();
      const stampYear = forNextYear ? currentYear + 1 : currentYear;
      
      // Update inventory (decrement issued count)
      await stampRepository.decrementIssuedCount(type, stampYear);
      
      // We'll handle the membership details update in the controller
      if (memberId) {
        console.log(`Stamp returned for member: ${memberId}, type: ${type}, for year: ${stampYear}`);
      }

      return { success: true };
    } catch (error) {
      throw new DatabaseError(
        "Error returning stamp: " +
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

  async archiveAndResetInventory(year: number, memberId: number, notes: string = '') {
    try {
      // Provjera je li godina već arhivirana
      const existingHistory = await stampRepository.getStampHistoryByYear(year);
      if (existingHistory.length > 0) {
        throw new Error(`Stamp inventory for year ${year} has already been archived`);
      }

      await stampRepository.archiveAndResetInventory(year, memberId, notes);
      return { 
        success: true, 
        message: `Successfully archived stamp inventory for year ${year} and reset for the new season` 
      };
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
