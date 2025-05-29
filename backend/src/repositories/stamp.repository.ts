import db from '../utils/db.js';
import { getCurrentDate, formatDate } from '../utils/dateUtils.js';

interface StampInventory {
    stamp_type: 'employed' | 'student' | 'pensioner';
    stamp_year: number;
    initial_count: number;
    issued_count: number;
}

const stampRepository = {
    async getInventory(): Promise<StampInventory[]> {
        try {
            // Pokušaj s originalnim upitom
            const result = await db.query<StampInventory>(
                'SELECT stamp_type, stamp_year, initial_count, issued_count FROM stamp_inventory'
            );
            return result.rows;
        } catch (error: unknown) {
            // Ako nema kolone stamp_year, koristi alternativni upit
            if (error instanceof Error && error.message && error.message.includes('column "stamp_year" does not exist')) {
                console.warn('⚠️ Upozorenje: Kolona stamp_year ne postoji u tablici stamp_inventory. Koristi se alternativni upit.');
                try {
                    // Koristi samo kolone koje sigurno postoje i dodaj default vrijednost za stamp_year
                    const fallbackResult = await db.query<StampInventory>(
                        'SELECT stamp_type, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER as stamp_year, initial_count, issued_count FROM stamp_inventory'
                    );
                    return fallbackResult.rows;
                } catch (fallbackError: unknown) {
                    console.error('❌ Greška prilikom izvršavanja alternativnog upita:', fallbackError);
                    return [];
                }
            }
            
            console.error('❌ Greška prilikom dohvaćanja inventara markica:', error);
            return [];
        }
    },

    async getInventoryByYear(year: number): Promise<StampInventory[]> {
        try {
            const result = await db.query<StampInventory>(
                'SELECT stamp_type, stamp_year, initial_count, issued_count FROM stamp_inventory WHERE stamp_year = $1',
                [year]
            );
            return result.rows;
        } catch (error: unknown) {
            console.error('❌ Greška prilikom dohvaćanja inventara markica za godinu:', error);
            return [];
        }
    },

    async updateInventory(
        stamp_type: string, 
        initial_count: number,
        stamp_year: number
    ): Promise<void> {
        try {
            // Provjera postoji li stamp_year kolona
            try {
                const existingRecord = await db.query(
                    'SELECT 1 FROM stamp_inventory WHERE stamp_type = $1 AND stamp_year = $2',
                    [stamp_type, stamp_year]
                );
                
                if (existingRecord.rows && existingRecord.rows.length > 0) {
                    await db.query(
                        `UPDATE stamp_inventory 
                        SET initial_count = $1,
                            last_updated = CURRENT_TIMESTAMP
                        WHERE stamp_type = $2 AND stamp_year = $3`,
                        [initial_count, stamp_type, stamp_year]
                    );
                } else {
                    await db.query(
                        `INSERT INTO stamp_inventory 
                        (stamp_type, stamp_year, initial_count, issued_count, last_updated)
                        VALUES ($1, $2, $3, 0, CURRENT_TIMESTAMP)`,
                        [stamp_type, stamp_year, initial_count]
                    );
                }
            } catch (error: unknown) {
                // Ako nema kolone stamp_year, koristi alternativni upit
                if (error instanceof Error && error.message && error.message.includes('column "stamp_year" does not exist')) {
                    console.warn('⚠️ Upozorenje: Kolona stamp_year ne postoji u tablici stamp_inventory. Koristi se alternativni upit bez stamp_year kolone.');
                    const existingRecordFallback = await db.query(
                        'SELECT 1 FROM stamp_inventory WHERE stamp_type = $1',
                        [stamp_type]
                    );
                    
                    if (existingRecordFallback.rows && existingRecordFallback.rows.length > 0) {
                        await db.query(
                            `UPDATE stamp_inventory 
                            SET initial_count = $1,
                                last_updated = CURRENT_TIMESTAMP
                            WHERE stamp_type = $2`,
                            [initial_count, stamp_type]
                        );
                    } else {
                        await db.query(
                            `INSERT INTO stamp_inventory 
                            (stamp_type, initial_count, issued_count, last_updated)
                            VALUES ($1, $2, 0, CURRENT_TIMESTAMP)`,
                            [stamp_type, initial_count]
                        );
                    }
                } else {
                    throw error; // Proslijedi dalje ako je druga greška
                }
            }
        } catch (error: unknown) {
            console.error('❌ Greška prilikom ažuriranja inventara markica:', error);
            throw error;
        }
    },

    async incrementIssuedCount(stamp_type: string, stamp_year: number): Promise<void> {
        try {
            // Provjera postoji li stamp_year kolona
            try {
                const existingRecord = await db.query(
                    'SELECT 1 FROM stamp_inventory WHERE stamp_type = $1 AND stamp_year = $2',
                    [stamp_type, stamp_year]
                );
                
                if (existingRecord.rows && existingRecord.rows.length > 0) {
                    await db.query(
                        `UPDATE stamp_inventory 
                        SET issued_count = issued_count + 1,
                            last_updated = CURRENT_TIMESTAMP
                        WHERE stamp_type = $1 AND stamp_year = $2`,
                        [stamp_type, stamp_year]
                    );
                } else {
                    await db.query(
                        `INSERT INTO stamp_inventory 
                        (stamp_type, stamp_year, initial_count, issued_count, last_updated)
                        VALUES ($1, $2, 0, 1, CURRENT_TIMESTAMP)`,
                        [stamp_type, stamp_year]
                    );
                }
            } catch (error: unknown) {
                // Ako nema kolone stamp_year, koristi alternativni upit
                if (error instanceof Error && error.message && error.message.includes('column "stamp_year" does not exist')) {
                    console.warn('⚠️ Upozorenje: Kolona stamp_year ne postoji u tablici stamp_inventory. Koristi se alternativni upit bez stamp_year kolone.');
                    const existingRecordFallback = await db.query(
                        'SELECT 1 FROM stamp_inventory WHERE stamp_type = $1',
                        [stamp_type]
                    );
                    
                    if (existingRecordFallback.rows && existingRecordFallback.rows.length > 0) {
                        await db.query(
                            `UPDATE stamp_inventory 
                            SET issued_count = issued_count + 1,
                                last_updated = CURRENT_TIMESTAMP
                            WHERE stamp_type = $1`,
                            [stamp_type]
                        );
                    } else {
                        await db.query(
                            `INSERT INTO stamp_inventory 
                            (stamp_type, initial_count, issued_count, last_updated)
                            VALUES ($1, 0, 1, CURRENT_TIMESTAMP)`,
                            [stamp_type]
                        );
                    }
                } else {
                    throw error; // Proslijedi dalje ako je druga greška
                }
            }
        } catch (error: unknown) {
            console.error('❌ Greška prilikom povećanja broja izdanih markica:', error);
            throw error;
        }
    },

    async decrementIssuedCount(stamp_type: string, stamp_year: number): Promise<void> {
        try {
            // Provjera postoji li stamp_year kolona
            try {
                await db.query(
                  `UPDATE stamp_inventory 
                   SET issued_count = GREATEST(issued_count - 1, 0),
                       last_updated = CURRENT_TIMESTAMP
                   WHERE stamp_type = $1 AND stamp_year = $2`,
                  [stamp_type, stamp_year]
                );
            } catch (error: unknown) {
                // Ako nema kolone stamp_year, koristi alternativni upit
                if (error instanceof Error && error.message && error.message.includes('column "stamp_year" does not exist')) {
                    console.warn('⚠️ Upozorenje: Kolona stamp_year ne postoji u tablici stamp_inventory. Koristi se alternativni upit bez stamp_year kolone.');
                    await db.query(
                      `UPDATE stamp_inventory 
                       SET issued_count = GREATEST(issued_count - 1, 0),
                           last_updated = CURRENT_TIMESTAMP
                       WHERE stamp_type = $1`,
                      [stamp_type]
                    );
                } else {
                    throw error; // Proslijedi dalje ako je druga greška
                }
            }
        } catch (error: unknown) {
            console.error('❌ Greška prilikom smanjenja broja izdanih markica:', error);
            throw error;
        }
    },

    async getStampHistory(): Promise<any[]> {
        const result = await db.query(
          `SELECT 
            h.id, 
            h.year, 
            h.stamp_type, 
            h.initial_count, 
            h.issued_count, 
            h.reset_date,
            h.reset_by,
            h.notes,
            m.first_name || ' ' || m.last_name as reset_by_name
          FROM 
            stamp_history h
          LEFT JOIN
            members m ON h.reset_by = m.member_id
          ORDER BY 
            h.year DESC, h.reset_date DESC`
        );
        return result.rows;
    },

    async getStampHistoryByYear(year: number): Promise<any[]> {
        const result = await db.query(
          `SELECT 
            h.id, 
            h.year, 
            h.stamp_type, 
            h.initial_count, 
            h.issued_count, 
            h.reset_date,
            h.reset_by,
            h.notes,
            m.first_name || ' ' || m.last_name as reset_by_name
          FROM 
            stamp_history h
          LEFT JOIN
            members m ON h.reset_by = m.member_id
          WHERE
            h.year = $1
          ORDER BY 
            h.reset_date DESC`,
          [year]
        );
        return result.rows;
    },

    /**
     * Arhivira trenutno stanje markica za određenu godinu bez resetiranja inventara.
     * @param year Godina za koju se arhiviraju markice
     * @param memberId ID člana koji vrši arhiviranje
     * @param notes Bilješke o arhiviranju
     */
    async archiveStampInventory(year: number, memberId: number, notes: string = ''): Promise<void> {
        try {
            // Koristimo simulirani datum iz getCurrentDate funkcije
            const currentDate = getCurrentDate();
            const formattedDate = formatDate(currentDate, 'yyyy-MM-dd').split('T')[0]; // Format YYYY-MM-DD
            
            await db.transaction(async (client) => {
                // Filtriramo markice samo za zadanu godinu
                const currentInventory = await client.query(
                    'SELECT stamp_type, stamp_year, initial_count, issued_count FROM stamp_inventory WHERE stamp_year = $1',
                    [year]
                );

                if (currentInventory.rows.length === 0) {
                    throw new Error(`No stamp inventory found for year ${year}`);
                }

                for (const item of currentInventory.rows) {
                    await client.query(
                        `INSERT INTO stamp_history
                            (year, stamp_type, stamp_year, initial_count, issued_count, reset_date, reset_by, notes)
                        VALUES
                            ($1, $2, $3, $4, $5, $6, $7, $8)`,
                        [
                            year, 
                            item.stamp_type, 
                            item.stamp_year, 
                            item.initial_count, 
                            item.issued_count, 
                            formattedDate,  // Koristimo simulirani datum iz dateUtils
                            memberId, 
                            notes
                        ]
                    );
                }

                // Nema resetiranja markica, samo arhiviramo stanje
            });
        } catch (error: unknown) {
            console.error('❌ Greška prilikom arhiviranja inventara markica:', error);
            throw error;
        }
    },

    /**
     * @deprecated Ova metoda je zastarjela, koristite archiveStampInventory umjesto nje
     */
    async archiveAndResetInventory(year: number, memberId: number, notes: string = ''): Promise<void> {
        console.warn('archiveAndResetInventory je zastarjela metoda, koristite archiveStampInventory umjesto nje');
        return this.archiveStampInventory(year, memberId, notes);
    }
};

export default stampRepository;