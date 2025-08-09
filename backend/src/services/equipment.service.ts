import equipmentRepository from "../repositories/equipment.repository.js";
import memberRepository from "../repositories/member.repository.js";
import auditService from "./audit.service.js";
import { DatabaseError } from "../utils/errors.js";
import { PerformerType } from '@prisma/client';

// Helper funkcije izdvojene izvan objekta kako bi se izbjegla self-referential tipizacija
function getGenderFromMember(memberGender: string | undefined): 'male' | 'female' {
    if (!memberGender) {
        throw new Error('Member gender is required');
    }
    switch (memberGender.toLowerCase()) {
        case 'male':
            return 'male';
        case 'female':
            return 'female';
        default:
            throw new Error(`Invalid member gender: ${memberGender}`);
    }
}

function getEquipmentDeliveryField(equipmentType: string): string {
    switch (equipmentType) {
        case 'tshirt':
            return 'tshirt_delivered';
        case 'shell_jacket':
            return 'shell_jacket_delivered';
        case 'hat':
            return 'hat_delivered';
        default:
            throw new Error(`Unknown equipment type: ${equipmentType}`);
    }
}

function getEquipmentSizeField(equipmentType: string): string {
    switch (equipmentType) {
        case 'tshirt':
            return 'tshirt_size';
        case 'shell_jacket':
            return 'shell_jacket_size';
        case 'hat':
            return 'hat_size';
        default:
            throw new Error(`Unknown equipment type: ${equipmentType}`);
    }
}

const equipmentService = {
    /**
     * Dohvaća status inventara opreme s kalkulacijom remaining
     */
    async getInventoryStatus() {
        try {
            const inventory = await equipmentRepository.getInventory();
            return inventory.map((item) => ({
                ...item,
                remaining: item.initial_count - item.issued_count - item.gift_count,
                total_distributed: item.issued_count + item.gift_count
            }));
        } catch (_error) {
            throw new DatabaseError("Error fetching equipment inventory");
        }
    },

    /**
     * Dohvaća status inventara za određeni tip opreme
     */
    async getInventoryStatusByType(equipmentType: string) {
        try {
            const inventory = await equipmentRepository.getInventoryByType(equipmentType);
            return inventory.map((item) => ({
                ...item,
                remaining: item.initial_count - item.issued_count - item.gift_count,
                total_distributed: item.issued_count + item.gift_count
            }));
        } catch (_error) {
            throw new DatabaseError(`Error fetching equipment inventory for type ${equipmentType}`);
        }
    },

    /**
     * Ažurira početno stanje inventara za određenu kombinaciju
     */
    async updateInitialCount(
        equipmentType: string,
        size: string,
        gender: string,
        count: number
    ) {
        try {
            if (count < 0) {
                throw new Error("Initial count cannot be negative");
            }

            // Provjeri trenutno stanje
            const currentInventory = await equipmentRepository.getInventoryByTypeAndDetails(
                equipmentType, size, gender
            );

            if (currentInventory) {
                const totalDistributed = currentInventory.issued_count + currentInventory.gift_count;
                if (count < totalDistributed) {
                    throw new Error(
                        `New count (${count}) cannot be less than already distributed equipment (${totalDistributed})`
                    );
                }
            }

            await equipmentRepository.updateInventory(equipmentType, size, gender, count);
        } catch (error) {
            throw new DatabaseError(
                "Error updating equipment inventory: " +
                (error instanceof Error ? error.message : "Unknown error")
            );
        }
    },



    /**
     * Označava opremu kao isporučenu članu (glavna funkcija)
     */
    async markEquipmentAsDelivered(
        memberId: number,
        equipmentType: string,
        performerId: number,
        performerType?: PerformerType
    ): Promise<void> {
        try {
            // Dohvati member podatke
            const member = await memberRepository.findById(memberId);
            if (!member) {
                throw new Error("Member not found");
            }

            // Provjeri ima li member veličinu za ovaj tip opreme
            const sizeField = getEquipmentSizeField(equipmentType);
            const memberSize = member[sizeField as keyof typeof member] as unknown as string | null | undefined;

            if (!memberSize) {
                throw new Error(`Member does not have ${equipmentType} size specified`);
            }

            // Provjeri je li oprema već isporučena
            const deliveryField = getEquipmentDeliveryField(equipmentType);
            const alreadyDelivered = member[deliveryField as keyof typeof member] as unknown as boolean | undefined;

            if (alreadyDelivered) {
                throw new Error(`${equipmentType} already delivered to member ${memberId}`);
            }

            // Određi spol za inventory
            const memberGender = getGenderFromMember(member.gender);

            // Provjeri dostupnost u inventaru
            const inventory = await equipmentRepository.getInventoryByTypeAndDetails(
                equipmentType, memberSize, memberGender
            );

            if (!inventory) {
                throw new Error(
                    `No inventory found for ${equipmentType}-${memberSize}-${memberGender}`
                );
            }

            const remaining = inventory.initial_count - inventory.issued_count - inventory.gift_count;
            if (remaining <= 0) {
                throw new Error(
                    `No ${equipmentType} (${memberSize}, ${memberGender}) available in inventory`
                );
            }

            // Ažuriraj inventory (povećaj issued_count)
            await equipmentRepository.incrementIssuedCount(equipmentType, memberSize, memberGender);

            // Ažuriraj member podatke (označi kao isporučeno)
            const memberUpdateData = {
                [deliveryField]: true
            };
            await memberRepository.update(memberId, memberUpdateData);

            // Logiraj akciju
            await auditService.logAction(
                'DELIVER_EQUIPMENT',
                performerId,
                `Delivered ${equipmentType} (${memberSize}, ${memberGender}) to member ${memberId}`,
                undefined,
                'success',
                memberId,
                performerType
            );

            console.log(`Equipment delivered: ${equipmentType} to member ${memberId}`);
        } catch (error) {
            throw new DatabaseError(
                "Error marking equipment as delivered: " +
                (error instanceof Error ? error.message : "Unknown error")
            );
        }
    },

    /**
     * Poništava isporuku opreme (vraća u inventory)
     */
    async unmarkEquipmentAsDelivered(
        memberId: number,
        equipmentType: string,
        performerId: number,
        performerType?: PerformerType
    ): Promise<void> {
        try {
            // Dohvati member podatke
            const member = await memberRepository.findById(memberId);
            if (!member) {
                throw new Error("Member not found");
            }

            // Provjeri je li oprema uopće isporučena
            const deliveryField = getEquipmentDeliveryField(equipmentType);
            const isDelivered = member[deliveryField as keyof typeof member] as unknown as boolean | undefined;

            if (!isDelivered) {
                throw new Error(`${equipmentType} is not marked as delivered to member ${memberId}`);
            }

            // Dohvati veličinu
            const sizeField = getEquipmentSizeField(equipmentType);
            const memberSize = member[sizeField as keyof typeof member] as unknown as string | null | undefined;

            if (!memberSize) {
                throw new Error(`Member does not have ${equipmentType} size specified`);
            }

            // Određi spol za inventory
            const memberGender = getGenderFromMember(member.gender);

            // Ažuriraj inventory (smanji issued_count)
            await equipmentRepository.decrementIssuedCount(equipmentType, memberSize, memberGender);

            // Ažuriraj member podatke (ukloni oznaku isporuke)
            const memberUpdateData = {
                [deliveryField]: false
            };
            await memberRepository.update(memberId, memberUpdateData);

            // Logiraj akciju
            await auditService.logAction(
                'UNDELIVER_EQUIPMENT',
                performerId,
                `Returned ${equipmentType} (${memberSize}, ${memberGender}) from member ${memberId}`,
                undefined,
                'success',
                memberId,
                performerType
            );

            console.log(`Equipment returned: ${equipmentType} from member ${memberId}`);
        } catch (error) {
            throw new DatabaseError(
                "Error unmarking equipment as delivered: " +
                (error instanceof Error ? error.message : "Unknown error")
            );
        }
    },

    /**
     * Izdaje opremu kao poklon (povećava gift_count)
     */
    async issueEquipmentAsGift(
        equipmentType: string,
        size: string,
        gender: string,
        performerId: number,
        notes?: string,
        performerType?: PerformerType
    ): Promise<void> {
        try {
            // Provjeri dostupnost u inventaru
            const inventory = await equipmentRepository.getInventoryByTypeAndDetails(
                equipmentType, size, gender
            );

            if (!inventory) {
                throw new Error(
                    `No inventory found for ${equipmentType}-${size}-${gender}`
                );
            }

            const remaining = inventory.initial_count - inventory.issued_count - inventory.gift_count;
            if (remaining <= 0) {
                throw new Error(
                    `No ${equipmentType} (${size}, ${gender}) available in inventory`
                );
            }

            // Ažuriraj inventory (povećaj gift_count)
            await equipmentRepository.incrementGiftCount(equipmentType, size, gender);

            // Logiraj akciju
            const logMessage = notes
                ? `Issued ${equipmentType} (${size}, ${gender}) as gift. Notes: ${notes}`
                : `Issued ${equipmentType} (${size}, ${gender}) as gift`;

            await auditService.logAction(
                'GIFT_EQUIPMENT',
                performerId,
                logMessage,
                undefined,
                'success',
                undefined, // Nema specific member_id za poklone
                performerType
            );

            console.log(`Equipment gifted: ${equipmentType} (${size}, ${gender})`);
        } catch (error) {
            throw new DatabaseError(
                "Error issuing equipment as gift: " +
                (error instanceof Error ? error.message : "Unknown error")
            );
        }
    },

    /**
     * Poništava poklon opreme (vraća u inventory)
     */
    async ungiftEquipment(
        equipmentType: string,
        size: string,
        gender: string,
        performerId: number,
        notes?: string,
        performerType?: PerformerType
    ): Promise<void> {
        try {
            // Provjeri postoji li inventory zapis
            const inventory = await equipmentRepository.getInventoryByTypeAndDetails(
                equipmentType, size, gender
            );

            if (!inventory) {
                throw new Error(
                    `No inventory found for ${equipmentType}-${size}-${gender}`
                );
            }

            if (inventory.gift_count <= 0) {
                throw new Error(
                    `No gifts to return for ${equipmentType} (${size}, ${gender})`
                );
            }

            // Ažuriraj inventory (smanji gift_count)
            await equipmentRepository.decrementGiftCount(equipmentType, size, gender);

            // Logiraj akciju
            const logMessage = notes
                ? `Returned gift ${equipmentType} (${size}, ${gender}) to inventory. Notes: ${notes}`
                : `Returned gift ${equipmentType} (${size}, ${gender}) to inventory`;

            await auditService.logAction(
                'UNGIFT_EQUIPMENT',
                performerId,
                logMessage,
                undefined,
                'success',
                undefined, // Nema specific member_id za poklone
                performerType
            );

            console.log(`Equipment gift returned: ${equipmentType} (${size}, ${gender})`);
        } catch (error) {
            throw new DatabaseError(
                "Error returning gifted equipment: " +
                (error instanceof Error ? error.message : "Unknown error")
            );
        }
    },



    /**
     * Dohvaća statistike opreme za određenog člana
     */
    async getMemberEquipmentStatus(memberId: number) {
        try {
            const member = await memberRepository.findById(memberId);
            if (!member) {
                throw new Error("Member not found");
            }

            return {
                member_id: memberId,
                tshirt: {
                    size: member['tshirt_size'],
                    delivered: member['tshirt_delivered'] || false
                },
                shell_jacket: {
                    size: member['shell_jacket_size'],
                    delivered: member['shell_jacket_delivered'] || false
                },
                hat: {
                    size: member['hat_size'],
                    delivered: member['hat_delivered'] || false
                }
            };
        } catch (error) {
            throw new DatabaseError(
                "Error fetching member equipment status: " +
                (error instanceof Error ? error.message : "Unknown error")
            );
        }
    }
}

export default equipmentService;
