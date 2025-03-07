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
      }
};

export default stampRepository;