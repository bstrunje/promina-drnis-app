import equipmentRepository from '../repositories/equipment.repository.js';
import memberRepository from '../repositories/member.repository.js';
import { DatabaseError } from '../utils/errors.js';
import { getOrganizationId } from '../middleware/tenant.middleware.js';
import { Request } from 'express';
import auditService from "./audit.service.js";
import { PerformerType } from '@prisma/client';
import prisma from "../utils/prisma.js";
const isDev = process.env.NODE_ENV === 'development';

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
    async getInventoryStatus(req: Request) {
        try {
            const organizationId = getOrganizationId(req);
            const inventory = await equipmentRepository.getInventory(organizationId);
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
    async getInventoryStatusByType(req: Request, equipmentType: string) {
        try {
            const organizationId = getOrganizationId(req);
            const inventory = await equipmentRepository.getInventoryByEquipmentType(organizationId, equipmentType);
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
        req: Request,
        equipmentType: string,
        size: string,
        gender: string,
        count: number
    ) {
        try {
            if (count < 0) {
                throw new Error("Initial count cannot be negative");
            }

            const organizationId = getOrganizationId(req);
            
            // Provjeri trenutno stanje
            const currentInventory = await equipmentRepository.getInventoryByType(
                organizationId, equipmentType, size, gender
            );

            if (currentInventory) {
                const totalDistributed = currentInventory.issued_count + currentInventory.gift_count;
                if (count < totalDistributed) {
                    throw new Error(
                        `New count (${count}) cannot be less than already distributed equipment (${totalDistributed})`
                    );
                }
            }

            await equipmentRepository.updateInventory(organizationId, equipmentType, size, gender, count);
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
        req: Request,
        memberId: number,
        equipmentType: string,
        performerId: number,
        performerType?: PerformerType
    ): Promise<void> {
        const organizationId = getOrganizationId(req);
        try {
            // Dohvati member podatke
            const member = await memberRepository.findById(organizationId, memberId);
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
            const inventory = await equipmentRepository.getInventoryByType(
                organizationId, equipmentType, memberSize, memberGender
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
            await equipmentRepository.incrementIssuedCount(organizationId, equipmentType, memberSize, memberGender);

            // Ažuriraj member podatke (označi kao isporučeno)
            const memberUpdateData = {
                [deliveryField]: true
            };
            await memberRepository.update(organizationId, memberId, memberUpdateData);

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

            if (isDev) console.log(`Equipment delivered: ${equipmentType} to member ${memberId}`);
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
        req: Request,
        memberId: number,
        equipmentType: string,
        performerId: number,
        performerType?: PerformerType
    ): Promise<void> {
        const organizationId = getOrganizationId(req);
        try {
            // Dohvati member podatke
            const member = await memberRepository.findById(organizationId, memberId);
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
            await equipmentRepository.decrementIssuedCount(organizationId, equipmentType, memberSize, memberGender);

            // Ažuriraj member podatke (ukloni oznaku isporuke)
            const memberUpdateData = {
                [deliveryField]: false
            };
            await memberRepository.update(organizationId, memberId, memberUpdateData);

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

            if (isDev) console.log(`Equipment returned: ${equipmentType} from member ${memberId}`);
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
        req: Request,
        equipmentType: string,
        size: string,
        gender: string,
        performerId: number,
        notes?: string,
        performerType?: PerformerType
    ): Promise<void> {
        try {
            const organizationId = getOrganizationId(req);
            
            // Provjeri dostupnost u inventaru
            const inventory = await equipmentRepository.getInventoryByType(
                organizationId, equipmentType, size, gender
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
            await equipmentRepository.incrementGiftCount(organizationId, equipmentType, size, gender);

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

            if (isDev) console.log(`Equipment gifted: ${equipmentType} (${size}, ${gender})`);
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
        req: Request,
        equipmentType: string,
        size: string,
        gender: string,
        performerId: number,
        notes?: string,
        performerType?: PerformerType
    ): Promise<void> {
        try {
            const organizationId = getOrganizationId(req);
            
            // Provjeri postoji li inventory zapis
            const inventory = await equipmentRepository.getInventoryByType(
                organizationId, equipmentType, size, gender
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
            await equipmentRepository.decrementGiftCount(organizationId, equipmentType, size, gender);

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

            if (isDev) console.log(`Equipment gift returned: ${equipmentType} (${size}, ${gender})`);
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
    async getMemberEquipmentStatus(req: Request, memberId: number) {
        const organizationId = getOrganizationId(req);
        try {
            const member = await memberRepository.findById(organizationId, memberId);
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
    },

    /**
     * Dohvaća članove koji su primili određenu opremu
     */
    async getMembersWithEquipment(equipmentType: string, size: string, gender: string) {
        try {
            // Mapiranje tipova opreme na polja u bazi
            const deliveryField = getEquipmentDeliveryField(equipmentType);
            const sizeField = getEquipmentSizeField(equipmentType);

            // Dohvati članove koji imaju isporučenu opremu određenog tipa, veličine i spola
            const members = await prisma.member.findMany({
                where: {
                    [deliveryField]: true,
                    [sizeField]: size,
                    gender: gender.toLowerCase()
                },
                include: {
                    membership_details: {
                        select: {
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
                card_number: member.membership_details?.card_number || null
            }));

        } catch (error) {
            throw new DatabaseError(
                "Error fetching members with equipment: " +
                (error instanceof Error ? error.message : "Unknown error")
            );
        }
    }
}

export default equipmentService;
