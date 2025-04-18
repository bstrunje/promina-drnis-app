import stampRepository from "../repositories/stamp.repository.js";
import membershipRepository from "../repositories/membership.repository.js";
import { DatabaseError } from "../utils/errors.js";

const stampService = {
  async getInventoryStatus() {
    try {
      const inventory = await stampRepository.getInventory();
      return inventory.map((item) => ({
        ...item,
        remaining: item.initial_count - item.issued_count,
      }));
    } catch (error) {
      throw new DatabaseError("Error fetching stamp inventory");
    }
  },

  async updateInitialCount(type: string, count: number) {
    try {
      if (count < 0) {
        throw new Error("Initial count cannot be negative");
      }

      const inventory = await stampRepository.getInventory();
      const currentInventory = inventory.find(
        (item) => item.stamp_type === type
      );

      if (currentInventory && count < currentInventory.issued_count) {
        throw new Error("New count cannot be less than already issued stamps");
      }

      await stampRepository.updateInventory(type, count);
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
        return "employed"; // Default for unknown values
    }
  },

  async issueStamp(memberId: number, givenStampType: string | null = null) {
    try {
      const member = await membershipRepository.getMembershipDetails(memberId);
      if (!member) {
        throw new Error("Member not found");
      }

      // Determine stamp type based on life status
      const stampType =
        givenStampType || this.getStampTypeFromLifeStatus(member.life_status || "");

      // Check if stamp is available in inventory
      const inventory = await stampRepository.getInventory();
      const stampInventory = inventory.find(
        (item) => item.stamp_type === stampType
      );

      if (!stampInventory) {
        throw new Error(`No inventory found for ${stampType} stamps`);
      }

      if (stampInventory.initial_count <= stampInventory.issued_count) {
        throw new Error(`No ${stampType} stamps available in inventory`);
      }

      // Issue stamp and update inventory
      await stampRepository.incrementIssuedCount(stampType);
      await membershipRepository.updateMembershipDetails(memberId, {
        card_stamp_issued: true,
      });

      return { success: true };
    } catch (error) {
      throw new DatabaseError(
        "Error issuing stamp: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  },

  async returnStamp(type: string, memberId?: number) {
    try {
      // If type is actually a life status string, convert it
      let stampType = type;
      if (
        type &&
        (type.includes("/") ||
          type === "employed/unemployed" ||
          type === "child/pupil/student" ||
          type === "pensioner")
      ) {
        stampType = this.getStampTypeFromLifeStatus(type);
      }

      const inventory = await stampRepository.getInventory();
      const stamp = inventory.find((item) => item.stamp_type === stampType);

      if (!stamp) {
        throw new Error(`No inventory record found for type: ${stampType}`);
      }

      // Update inventory
      await stampRepository.decrementIssuedCount(stampType);
      
      // If memberId is provided, also update the member's stamp status
      if (memberId) {
        await membershipRepository.updateMembershipDetails(memberId, {
          card_stamp_issued: false,
        });
      }
      
      return true;
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error("Error returning stamp to inventory");
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
