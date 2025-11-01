import { getCurrentDate, formatDate } from '../utils/dateUtils.js';
import prisma from '../utils/prisma.js';

const isDev = process.env.NODE_ENV === 'development';

interface StampInventory {
    stamp_type: 'employed' | 'student' | 'pensioner';
    stamp_year: number;
    initial_count: number;
    issued_count: number;
}

// Tip retka povijesti markica za API kompatibilnost
type StampHistoryRow = {
    id: number;
    year: number;
    stamp_type: string;
    initial_count: number;
    issued_count: number;
    reset_date: Date | null;
    reset_by: number | null;
    notes: string | null;
    reset_by_name: string | null;
};

const stampRepository = {
    async getInventory(organizationId: number): Promise<StampInventory[]> {
        try {
            if (isDev) console.log(`[STAMP-INVENTORY] Dohvaćam inventar markica za org ${organizationId} s Prisma...`);
            
            const stampInventory = await prisma.stampInventory.findMany({
                where: {
                    organization_id: organizationId
                },
                select: {
                    stamp_type: true,
                    stamp_year: true,
                    initial_count: true,
                    issued_count: true
                },
                orderBy: [
                    { stamp_year: 'desc' },
                    { stamp_type: 'asc' }
                ]
            });
            
            console.log(`[STAMP-INVENTORY] Pronađeno ${stampInventory.length} zapisa inventara`);
            
            // Konvertiraj Prisma rezultat u StampInventory format
            const result: StampInventory[] = stampInventory.map(item => ({
                stamp_type: item.stamp_type as 'employed' | 'student' | 'pensioner',
                stamp_year: item.stamp_year || getCurrentDate().getFullYear(), // Fallback na trenutnu godinu
                initial_count: item.initial_count,
                issued_count: item.issued_count || 0 // Null check za issued_count
            }));
            
            return result;
        } catch (error: unknown) {
            console.error('[STAMP-INVENTORY] Greška prilikom dohvaćanja inventara markica:', error);
            return [];
        }
    },

    async getInventoryByYear(organizationId: number, year: number): Promise<StampInventory[]> {
        try {
            if (isDev) console.log(`[STAMP-INVENTORY] Dohvaćam inventar markica za org ${organizationId}, godinu ${year} s Prisma...`);
            
            const stampInventory = await prisma.stampInventory.findMany({
                where: {
                    organization_id: organizationId,
                    stamp_year: year
                },
                select: {
                    stamp_type: true,
                    stamp_year: true,
                    initial_count: true,
                    issued_count: true
                },
                orderBy: {
                    stamp_type: 'asc'
                }
            });
            
            console.log(`[STAMP-INVENTORY] Pronađeno ${stampInventory.length} zapisa za godinu ${year}`);
            
            // Konvertiraj Prisma rezultat u StampInventory format
            const result: StampInventory[] = stampInventory.map(item => ({
                stamp_type: item.stamp_type as 'employed' | 'student' | 'pensioner',
                stamp_year: item.stamp_year || year,
                initial_count: item.initial_count,
                issued_count: item.issued_count || 0 // Null check za issued_count
            }));
            
            return result;
        } catch (error: unknown) {
            console.error(`[STAMP-INVENTORY] Greška prilikom dohvaćanja inventara markica za godinu ${year}:`, error);
            return [];
        }
    },

    async updateInventory(
        organizationId: number,
        stamp_type: string, 
        initial_count: number,
        stamp_year: number
    ): Promise<void> {
        try {
            if (isDev) console.log(`[STAMP-UPDATE] Ažuriram inventar markica za org ${organizationId}: ${stamp_type}, godina ${stamp_year}, početni broj ${initial_count}`);
            
            const updatedInventory = await prisma.stampInventory.upsert({
                where: {
                    stamp_type_year_unique: {
                        organization_id: organizationId,
                        stamp_type: stamp_type,
                        stamp_year: stamp_year
                    }
                },
                update: {
                    initial_count: initial_count,
                    last_updated: new Date()
                },
                create: {
                    organization_id: organizationId,
                    stamp_type: stamp_type,
                    stamp_year: stamp_year,
                    initial_count: initial_count,
                    issued_count: 0,
                    last_updated: new Date()
                }
            });
            
            if (isDev) console.log(`[STAMP-UPDATE] Inventar uspješno ažuriran: ID ${updatedInventory.id}, tip ${updatedInventory.stamp_type}`);
        } catch (error: unknown) {
            console.error(`[STAMP-UPDATE] Greška prilikom ažuriranja inventara markica za ${stamp_type}/${stamp_year}:`, error);
            throw error;
        }
    },

    async incrementIssuedCount(organizationId: number, stamp_type: string, stamp_year: number): Promise<void> {
        try {
            if (isDev) console.log(`[STAMP-INCREMENT] Povećavam broj izdanih markica za org ${organizationId}: ${stamp_type}, godina ${stamp_year}`);
            
            const updatedInventory = await prisma.stampInventory.upsert({
                where: {
                    stamp_type_year_unique: {
                        organization_id: organizationId,
                        stamp_type: stamp_type,
                        stamp_year: stamp_year
                    }
                },
                update: {
                    issued_count: {
                        increment: 1
                    },
                    last_updated: new Date()
                },
                create: {
                    organization_id: organizationId,
                    stamp_type: stamp_type,
                    stamp_year: stamp_year,
                    initial_count: 0,
                    issued_count: 1,
                    last_updated: new Date()
                }
            });
            
            if (isDev) console.log(`[STAMP-INCREMENT] Broj izdanih markica uspješno povećan: ${updatedInventory.stamp_type}, nova vrijednost: ${updatedInventory.issued_count}`);
        } catch (error: unknown) {
            console.error(`[STAMP-INCREMENT] Greška prilikom povećanja broja izdanih markica za ${stamp_type}/${stamp_year}:`, error);
            throw error;
        }
    },

    async decrementIssuedCount(stamp_type: string, stamp_year: number): Promise<void> {
        try {
            if (isDev) console.log(`[STAMP-DECREMENT] Smanjujem broj izdanih markica: ${stamp_type}, godina ${stamp_year}`);
            
             const updatedInventory = await prisma.stampInventory.updateMany({
                where: {
                    stamp_type: stamp_type,
                    stamp_year: stamp_year
                },
                data: {
                    issued_count: {
                        decrement: 1
                    },
                    last_updated: new Date()
                }
            });
            
            if (updatedInventory.count > 0) {
                if (isDev) console.log(`[STAMP-DECREMENT] Broj izdanih markica uspješno smanjen za ${stamp_type}/${stamp_year}`);
            } else {
                if (isDev) console.warn(`[STAMP-DECREMENT] Nema zapisa za ${stamp_type}/${stamp_year} - nema što smanjiti`);
            }
        } catch (error: unknown) {
            console.error(`[STAMP-DECREMENT] Greška prilikom smanjenja broja izdanih markica za ${stamp_type}/${stamp_year}:`, error);
            throw error;
        }
    },

    async getStampHistory(): Promise<StampHistoryRow[]> {
        try {
            if (isDev) console.log('[STAMP-HISTORY] Dohvaćam povijest markica s Prisma...');
            
            const stampHistory = await prisma.stamp_history.findMany({
                include: {
                    members: {
                        select: {
                            first_name: true,
                            last_name: true
                        }
                    }
                },
                orderBy: [
                    { year: 'desc' },
                    { reset_date: 'desc' }
                ]
            });
            
            console.log(`[STAMP-HISTORY] Pronađeno ${stampHistory.length} zapisa povijesti`);
            
            // Konvertiraj Prisma rezultat u legacy format
            const result = stampHistory.map(item => ({
                id: item.id,
                year: item.year,
                stamp_type: item.stamp_type,
                initial_count: item.initial_count,
                issued_count: item.issued_count,
                reset_date: item.reset_date,
                reset_by: item.reset_by,
                notes: item.notes,
                reset_by_name: item.members 
                    ? `${item.members.first_name} ${item.members.last_name}` 
                    : null
            }));
            
            return result;
        } catch (error: unknown) {
            console.error('[STAMP-HISTORY] Greška prilikom dohvaćanja povijesti markica:', error);
            return [];
        }
    },

    async getStampHistoryByYear(year: number): Promise<StampHistoryRow[]> {
        try {
            if (isDev) console.log(`[STAMP-HISTORY-YEAR] Dohvaćam povijest markica za godinu ${year} s Prisma...`);
            
            const stampHistory = await prisma.stamp_history.findMany({
                where: {
                    year: year
                },
                include: {
                    members: {
                        select: {
                            first_name: true,
                            last_name: true
                        }
                    }
                },
                orderBy: {
                    reset_date: 'desc'
                }
            });
            
            console.log(`[STAMP-HISTORY-YEAR] Pronađeno ${stampHistory.length} zapisa za godinu ${year}`);
            
            // Konvertiraj Prisma rezultat u legacy format
            const result = stampHistory.map(item => ({
                id: item.id,
                year: item.year,
                stamp_type: item.stamp_type,
                initial_count: item.initial_count,
                issued_count: item.issued_count,
                reset_date: item.reset_date,
                reset_by: item.reset_by,
                notes: item.notes,
                reset_by_name: item.members 
                    ? `${item.members.first_name} ${item.members.last_name}` 
                    : null
            }));
            
            return result;
        } catch (error: unknown) {
            console.error(`[STAMP-HISTORY-YEAR] Greška prilikom dohvaćanja povijesti markica za godinu ${year}:`, error);
            return [];
        }
    },

    /**
     * Arhivira trenutno stanje markica za određenu godinu bez resetiranja inventara.
     * @param year Godina za koju se arhiviraju markice
     * @param memberId ID člana koji vrši arhiviranje
     * @param notes Bilješke o arhiviranju
     */
    async archiveStampInventory(year: number, memberId: number, notes: string = ''): Promise<void> {
        try {
            if (isDev) console.log(`[STAMP-ARCHIVE] Arhiviram inventar markica za godinu ${year}, član ID: ${memberId}`);
            
            // Koristimo simulirani datum iz getCurrentDate funkcije
            const currentDate = getCurrentDate();
            const formattedDate = formatDate(currentDate, 'yyyy-MM-dd').split('T')[0]; // Format YYYY-MM-DD

            await prisma.$transaction(async (tx) => {
                // Dohvaćamo inventar za zadanu godinu s Prisma
                const currentInventory = await tx.stampInventory.findMany({
                    where: {
                        stamp_year: year
                    },
                    select: {
                        stamp_type: true,
                        stamp_year: true,
                        initial_count: true,
                        issued_count: true
                    }
                });

                if (currentInventory.length === 0) {
                    throw new Error(`No stamp inventory found for year ${year}`);
                }
                
                console.log(`[STAMP-ARCHIVE] Pronađeno ${currentInventory.length} zapisa za arhiviranje`);

                // Kreiramo batch insert za stamp_history s Prisma
                const historyRecords = currentInventory.map(item => ({
                    year: year,
                    stamp_type: item.stamp_type,
                    stamp_year: item.stamp_year || year,
                    initial_count: item.initial_count,
                    issued_count: item.issued_count || 0, // Null check za issued_count
                    reset_date: new Date(formattedDate),
                    reset_by: memberId,
                    notes: notes
                }));
                
                // Batch insert u stamp_history
                await tx.stamp_history.createMany({
                    data: historyRecords
                });
                
                if (isDev) console.log(`[STAMP-ARCHIVE] Uspješno arhivirano ${historyRecords.length} zapisa za godinu ${year}`);

                // Nema resetiranja markica, samo arhiviramo stanje
            });
        } catch (error: unknown) {
            console.error(`[STAMP-ARCHIVE] Greška prilikom arhiviranja inventara markica za godinu ${year}:`, error);
            throw error;
        }
    },

    /**
     * @deprecated Ova metoda je zastarjela, koristite archiveStampInventory umjesto nje
     */
    async archiveAndResetInventory(year: number, memberId: number, notes: string = ''): Promise<void> {
        if (isDev) console.warn('archiveAndResetInventory je zastarjela metoda, koristite archiveStampInventory umjesto nje');
        return this.archiveStampInventory(year, memberId, notes);
    }
};

export default stampRepository;