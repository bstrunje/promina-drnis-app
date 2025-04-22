import db from '../utils/db.js';

interface StampInventory {
    stamp_type: 'employed' | 'student' | 'pensioner';
    stamp_year: number;
    initial_count: number;
    issued_count: number;
}

const stampRepository = {
    async getInventory(): Promise<StampInventory[]> {
        const result = await db.query<StampInventory>(
            'SELECT stamp_type, stamp_year, initial_count, issued_count FROM stamp_inventory'
        );
        return result.rows;
    },

    async getInventoryByYear(year: number): Promise<StampInventory[]> {
        const result = await db.query<StampInventory>(
            'SELECT stamp_type, stamp_year, initial_count, issued_count FROM stamp_inventory WHERE stamp_year = $1',
            [year]
        );
        return result.rows;
    },

    async updateInventory(
        stamp_type: string, 
        initial_count: number,
        stamp_year: number
    ): Promise<void> {
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
    },

    async incrementIssuedCount(stamp_type: string, stamp_year: number): Promise<void> {
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
    },

    async decrementIssuedCount(stamp_type: string, stamp_year: number): Promise<void> {
        await db.query(
          `UPDATE stamp_inventory 
           SET issued_count = GREATEST(issued_count - 1, 0),
               last_updated = CURRENT_TIMESTAMP
           WHERE stamp_type = $1 AND stamp_year = $2`,
          [stamp_type, stamp_year]
        );
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

    async archiveAndResetInventory(year: number, memberId: number, notes: string = ''): Promise<void> {
        await db.transaction(async (client) => {
          const currentInventory = await client.query(
            'SELECT stamp_type, stamp_year, initial_count, issued_count FROM stamp_inventory'
          );

          for (const item of currentInventory.rows) {
            await client.query(
              `INSERT INTO stamp_history
                (year, stamp_type, stamp_year, initial_count, issued_count, reset_by, notes)
              VALUES
                ($1, $2, $3, $4, $5, $6, $7)`,
              [year, item.stamp_type, item.stamp_year, item.initial_count, item.issued_count, memberId, notes]
            );
          }

          await client.query(
            `UPDATE stamp_inventory 
             SET issued_count = 0,
                 last_updated = CURRENT_TIMESTAMP`
          );
        });
    }
};

export default stampRepository;