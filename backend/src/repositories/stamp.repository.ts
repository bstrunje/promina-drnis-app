import db from '../utils/db.js';

interface StampInventory {
    stamp_type: 'employed' | 'student' | 'pensioner';
    initial_count: number;
    issued_count: number;
}

const stampRepository = {
    async getInventory(): Promise<StampInventory[]> {
        const result = await db.query<StampInventory>(
            'SELECT stamp_type, initial_count, issued_count FROM stamp_inventory'
        );
        return result.rows;
    },

    async updateInventory(
        stamp_type: string, 
        initial_count: number
    ): Promise<void> {
        await db.query(
            `UPDATE stamp_inventory 
             SET initial_count = $1,
                 last_updated = CURRENT_TIMESTAMP
             WHERE stamp_type = $2`,
            [initial_count, stamp_type]
        );
    },

    async incrementIssuedCount(stamp_type: string): Promise<void> {
        await db.query(
            `UPDATE stamp_inventory 
             SET issued_count = issued_count + 1,
                 last_updated = CURRENT_TIMESTAMP
             WHERE stamp_type = $1`,
            [stamp_type]
        );
    },

    async decrementIssuedCount(stamp_type: string): Promise<void> {
        await db.query(
          `UPDATE stamp_inventory 
           SET issued_count = GREATEST(issued_count - 1, 0),
               last_updated = CURRENT_TIMESTAMP
           WHERE stamp_type = $1`,
          [stamp_type]
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
          // 1. Dohvati trenutno stanje inventara
          const currentInventory = await client.query(
            'SELECT stamp_type, initial_count, issued_count FROM stamp_inventory'
          );

          // 2. Arhiviraj trenutno stanje u stamp_history
          for (const item of currentInventory.rows) {
            await client.query(
              `INSERT INTO stamp_history
                (year, stamp_type, initial_count, issued_count, reset_by, notes)
              VALUES
                ($1, $2, $3, $4, $5, $6)`,
              [year, item.stamp_type, item.initial_count, item.issued_count, memberId, notes]
            );
          }

          // 3. Resetiraj issued_count na 0 (inventar za novu godinu)
          await client.query(
            `UPDATE stamp_inventory 
             SET issued_count = 0,
                 last_updated = CURRENT_TIMESTAMP`
          );
        });
    }
};

export default stampRepository;