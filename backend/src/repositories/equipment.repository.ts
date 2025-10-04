import prisma from '../utils/prisma.js';
import { getCurrentDate } from '../utils/dateUtils.js';

interface EquipmentInventory {
    equipment_type: 'tshirt' | 'shell_jacket' | 'hat';
    size: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL';
    gender: 'male' | 'female';
    initial_count: number;
    issued_count: number;
    gift_count: number;
    last_updated: Date;
}

const equipmentRepository: {
    getInventory(organizationId: number): Promise<EquipmentInventory[]>;
    getInventoryByEquipmentType(organizationId: number, equipmentType: string): Promise<EquipmentInventory[]>;
    getInventoryByType(organizationId: number, equipmentType: string, size: string, gender: string): Promise<EquipmentInventory | null>;
    updateInventory(organizationId: number, equipmentType: string, size: string, gender: string, initialCount: number): Promise<void>;
    incrementIssuedCount(organizationId: number, equipmentType: string, size: string, gender: string): Promise<void>;
    decrementIssuedCount(organizationId: number, equipmentType: string, size: string, gender: string): Promise<void>;
    incrementGiftCount(organizationId: number, equipmentType: string, size: string, gender: string): Promise<void>;
    decrementGiftCount(organizationId: number, equipmentType: string, size: string, gender: string): Promise<void>;
} = {
    /**
     * Dohvaća sav equipment inventory
     */
    async getInventory(organizationId: number): Promise<EquipmentInventory[]> {
        try {
            console.log(`[EQUIPMENT-INVENTORY] Dohvaćam inventar opreme za org ${organizationId} s Prisma...`);
            
            const equipmentInventory = await prisma.equipmentInventory.findMany({
                where: {
                    organization_id: organizationId
                },
                select: {
                    equipment_type: true,
                    size: true,
                    gender: true,
                    initial_count: true,
                    issued_count: true,
                    gift_count: true,
                    last_updated: true
                },
                orderBy: [
                    { equipment_type: 'asc' },
                    { gender: 'asc' },
                    { size: 'asc' }
                ]
            });
            
            console.log(`[EQUIPMENT-INVENTORY] Pronađeno ${equipmentInventory.length} zapisa inventara`);
            
            // Konvertiraj Prisma rezultat u EquipmentInventory format
            const result: EquipmentInventory[] = equipmentInventory.map(item => ({
                equipment_type: item.equipment_type as 'tshirt' | 'shell_jacket' | 'hat',
                size: item.size as 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL',
                gender: item.gender as 'male' | 'female',
                initial_count: item.initial_count,
                issued_count: item.issued_count,
                gift_count: item.gift_count,
                last_updated: item.last_updated
            }));
            
            return result;
        } catch (error: unknown) {
            console.error('[EQUIPMENT-INVENTORY] Greška prilikom dohvaćanja inventara opreme:', error);
            throw error;
        }
    },

    /**
     * Dohvaća inventory za određeni tip opreme
     */
    async getInventoryByEquipmentType(organizationId: number, equipmentType: string): Promise<EquipmentInventory[]> {
        try {
            console.log(`[EQUIPMENT-INVENTORY] Dohvaćam inventar za org ${organizationId}, tip ${equipmentType} s Prisma...`);
            
            const equipmentInventory = await prisma.equipmentInventory.findMany({
                where: {
                    organization_id: organizationId,
                    equipment_type: equipmentType
                },
                select: {
                    equipment_type: true,
                    size: true,
                    gender: true,
                    initial_count: true,
                    issued_count: true,
                    gift_count: true,
                    last_updated: true
                },
                orderBy: [
                    { gender: 'asc' },
                    { size: 'asc' }
                ]
            });
            
            console.log(`[EQUIPMENT-INVENTORY] Pronađeno ${equipmentInventory.length} zapisa za ${equipmentType}`);
            
            const result: EquipmentInventory[] = equipmentInventory.map(item => ({
                equipment_type: item.equipment_type as 'tshirt' | 'shell_jacket' | 'hat',
                size: item.size as 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL',
                gender: item.gender as 'male' | 'female',
                initial_count: item.initial_count,
                issued_count: item.issued_count,
                gift_count: item.gift_count,
                last_updated: item.last_updated
            }));
            
            return result;
        } catch (error: unknown) {
            console.error(`[EQUIPMENT-INVENTORY] Greška prilikom dohvaćanja inventara za ${equipmentType}:`, error);
            throw error;
        }
    },

    /**
     * Dohvaća inventory za određeni tip, veličinu i spol
     */
    async getInventoryByType(
        organizationId: number,
        equipmentType: string,
        size: string,
        gender: string
    ): Promise<EquipmentInventory | null> {
        try {
            console.log(`[EQUIPMENT-INVENTORY] Dohvaćam inventar za org ${organizationId}: ${equipmentType}-${size}-${gender} s Prisma...`);
            
            const equipmentInventory = await prisma.equipmentInventory.findUnique({
                where: {
                    equipment_unique: {
                        organization_id: organizationId,
                        equipment_type: equipmentType,
                        size: size,
                        gender: gender
                    }
                },
                select: {
                    equipment_type: true,
                    size: true,
                    gender: true,
                    initial_count: true,
                    issued_count: true,
                    gift_count: true,
                    last_updated: true
                }
            });
            
            if (!equipmentInventory) {
                console.log(`[EQUIPMENT-INVENTORY] Nema inventara za ${equipmentType}-${size}-${gender}`);
                return null;
            }
            
            const result: EquipmentInventory = {
                equipment_type: equipmentInventory.equipment_type as 'tshirt' | 'shell_jacket' | 'hat',
                size: equipmentInventory.size as 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL',
                gender: equipmentInventory.gender as 'male' | 'female',
                initial_count: equipmentInventory.initial_count,
                issued_count: equipmentInventory.issued_count,
                gift_count: equipmentInventory.gift_count,
                last_updated: equipmentInventory.last_updated
            };
            
            return result;
        } catch (error: unknown) {
            console.error(`[EQUIPMENT-INVENTORY] Greška prilikom dohvaćanja inventara za ${equipmentType}-${size}-${gender}:`, error);
            throw error;
        }
    },

    /**
     * Ažurira ili kreira inventory za određenu kombinaciju
     */
    async updateInventory(
        organizationId: number,
        equipmentType: string,
        size: string,
        gender: string,
        initialCount: number
    ): Promise<void> {
        try {
            console.log(`[EQUIPMENT-INVENTORY] Ažuriram inventar za ${equipmentType}-${size}-${gender}: ${initialCount}`);
            
            await prisma.equipmentInventory.upsert({
                where: {
                    equipment_unique: {
                        organization_id: organizationId,
                        equipment_type: equipmentType,
                        size: size,
                        gender: gender
                    }
                },
                update: {
                    initial_count: initialCount,
                    last_updated: getCurrentDate()
                },
                create: {
                    organization_id: organizationId,
                    equipment_type: equipmentType,
                    size: size,
                    gender: gender,
                    initial_count: initialCount,
                    issued_count: 0,
                    gift_count: 0,
                    last_updated: getCurrentDate()
                }
            });
            
            console.log(`[EQUIPMENT-INVENTORY] Uspješno ažuriran inventar za ${equipmentType}-${size}-${gender}`);
        } catch (error: unknown) {
            console.error(`[EQUIPMENT-INVENTORY] Greška prilikom ažuriranja inventara za ${equipmentType}-${size}-${gender}:`, error);
            throw error;
        }
    },

    /**
     * Povećava issued_count za određenu kombinaciju
     */
    async incrementIssuedCount(
        organizationId: number,
        equipmentType: string,
        size: string,
        gender: string
    ): Promise<void> {
        try {
            console.log(`[EQUIPMENT-INVENTORY] Povećavam issued_count za org ${organizationId}: ${equipmentType}-${size}-${gender}`);
            
            await prisma.equipmentInventory.update({
                where: {
                    equipment_unique: {
                        organization_id: organizationId,
                        equipment_type: equipmentType,
                        size: size,
                        gender: gender
                    }
                },
                data: {
                    issued_count: {
                        increment: 1
                    },
                    last_updated: getCurrentDate()
                }
            });
            
            console.log(`[EQUIPMENT-INVENTORY] Uspješno povećan issued_count za ${equipmentType}-${size}-${gender}`);
        } catch (error: unknown) {
            console.error(`[EQUIPMENT-INVENTORY] Greška prilikom povećavanja issued_count za ${equipmentType}-${size}-${gender}:`, error);
            throw error;
        }
    },

    /**
     * Smanjuje issued_count za određenu kombinaciju
     */
    async decrementIssuedCount(
        organizationId: number,
        equipmentType: string,
        size: string,
        gender: string
    ): Promise<void> {
        try {
            console.log(`[EQUIPMENT-INVENTORY] Smanjujem issued_count za org ${organizationId}: ${equipmentType}-${size}-${gender}`);
            
            await prisma.equipmentInventory.update({
                where: {
                    equipment_unique: {
                        organization_id: organizationId,
                        equipment_type: equipmentType,
                        size: size,
                        gender: gender
                    }
                },
                data: {
                    issued_count: {
                        decrement: 1
                    },
                    last_updated: getCurrentDate()
                }
            });
            
            console.log(`[EQUIPMENT-INVENTORY] Uspješno smanjen issued_count za ${equipmentType}-${size}-${gender}`);
        } catch (error: unknown) {
            console.error(`[EQUIPMENT-INVENTORY] Greška prilikom smanjivanja issued_count za ${equipmentType}-${size}-${gender}:`, error);
            throw error;
        }
    },

    /**
     * Povećava gift_count za određenu kombinaciju
     */
    async incrementGiftCount(
        organizationId: number,
        equipmentType: string,
        size: string,
        gender: string
    ): Promise<void> {
        try {
            console.log(`[EQUIPMENT-INVENTORY] Povećavam gift_count za org ${organizationId}: ${equipmentType}-${size}-${gender}`);
            
            await prisma.equipmentInventory.update({
                where: {
                    equipment_unique: {
                        organization_id: organizationId,
                        equipment_type: equipmentType,
                        size: size,
                        gender: gender
                    }
                },
                data: {
                    gift_count: {
                        increment: 1
                    },
                    last_updated: getCurrentDate()
                }
            });
            
            console.log(`[EQUIPMENT-INVENTORY] Uspješno povećan gift_count za ${equipmentType}-${size}-${gender}`);
        } catch (error: unknown) {
            console.error(`[EQUIPMENT-INVENTORY] Greška prilikom povećavanja gift_count za ${equipmentType}-${size}-${gender}:`, error);
            throw error;
        }
    },

    /**
     * Smanjuje gift_count za određenu kombinaciju
     */
    async decrementGiftCount(
        organizationId: number,
        equipmentType: string,
        size: string,
        gender: string
    ): Promise<void> {
        try {
            console.log(`[EQUIPMENT-INVENTORY] Smanjujem gift_count za org ${organizationId}: ${equipmentType}-${size}-${gender}`);
            
            await prisma.equipmentInventory.update({
                where: {
                    equipment_unique: {
                        organization_id: organizationId,
                        equipment_type: equipmentType,
                        size: size,
                        gender: gender
                    }
                },
                data: {
                    gift_count: {
                        decrement: 1
                    },
                    last_updated: getCurrentDate()
                }
            });
            
            console.log(`[EQUIPMENT-INVENTORY] Uspješno smanjen gift_count za ${equipmentType}-${size}-${gender}`);
        } catch (error: unknown) {
            console.error(`[EQUIPMENT-INVENTORY] Greška prilikom smanjivanja gift_count za ${equipmentType}-${size}-${gender}:`, error);
            throw error;
        }
    }
};

export default equipmentRepository;
