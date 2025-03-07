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
    console.log("Life status received:", lifeStatus); // For debugging

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
        console.log(
          `Warning: Unknown life status "${lifeStatus}", defaulting to "employed"`
        );
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
      console.log(`Using stamp type: ${stampType} for member ID ${memberId}`);

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
      console.error("Error in issueStamp:", error);
      throw new DatabaseError(
        "Error issuing stamp: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  },

  async returnStamp(type: string) {
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

      await stampRepository.decrementIssuedCount(stampType);
      return true;
    } catch (error) {
      console.error("Error returning stamp:", error);
      throw error instanceof Error
        ? error
        : new Error("Error returning stamp to inventory");
    }
  },
};

export default stampService;
