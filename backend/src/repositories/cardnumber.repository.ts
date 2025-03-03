import db from '../utils/db.js';

interface CardNumberResult {
  id: number;
  card_number: string;
  status: 'available' | 'assigned' | 'retired';
  assigned_at?: Date;
  member_id?: number;
}

const cardNumberRepository = {
  // Get all available card numbers
  async getAvailable(): Promise<string[]> {
    const result = await db.query<{ card_number: string }>(
      `SELECT card_number FROM card_numbers 
       WHERE status = 'available'
       ORDER BY card_number ASC`
    );
    
    return result.rows.map(row => row.card_number);
  },
  
  // Add a single card number
  async addSingle(cardNumber: string): Promise<void> {
    await db.query(
      `INSERT INTO card_numbers (card_number, status) 
       VALUES ($1, 'available')
       ON CONFLICT (card_number) DO NOTHING`,
      [cardNumber]
    );
  },
  
  // Add a range of card numbers
  async addRange(start: number, end: number, padLength: number): Promise<number> {
    let added = 0;
    
    // Transaction to ensure all-or-nothing insertion
    await db.transaction(async (client) => {
      for (let i = start; i <= end; i++) {
        // Pad the number with leading zeros
        const cardNumber = i.toString().padStart(padLength, '0');
        
        const result = await client.query(
          `INSERT INTO card_numbers (card_number, status) 
           VALUES ($1, 'available')
           ON CONFLICT (card_number) DO NOTHING
           RETURNING card_number`,
          [cardNumber]
        );
        
        // Fix null check
        if ((result?.rowCount ?? 0) > 0) {
          added++;
        }
      }
    });
    
    return added;
  },
  
  // Assign a card number to a member
  async assignToMember(cardNumber: string, memberId: number): Promise<boolean> {
    const result = await db.query(
      `UPDATE card_numbers
       SET status = 'assigned', 
           assigned_at = CURRENT_TIMESTAMP,
           member_id = $2
       WHERE card_number = $1 
       AND status = 'available'
       RETURNING id`,
      [cardNumber, memberId]
    );
    
    // Fix null check
    return (result?.rowCount ?? 0) > 0;
  },
  
  // Release a card number (make it available again)
  async releaseCardNumber(cardNumber: string): Promise<boolean> {
    const result = await db.query(
      `UPDATE card_numbers
       SET status = 'available', 
           assigned_at = NULL,
           member_id = NULL
       WHERE card_number = $1 
       AND status = 'assigned'
       RETURNING id`,
      [cardNumber]
    );
    
    // Fix null check
    return (result?.rowCount ?? 0) > 0;
  },
  
  // Check if a card number is available
  async isAvailable(cardNumber: string): Promise<boolean> {
    const result = await db.query(
      `SELECT 1 FROM card_numbers 
       WHERE card_number = $1 
       AND status = 'available'`,
      [cardNumber]
    );
    
    // Fix null check
    return (result?.rowCount ?? 0) > 0;
  },

  // Add this method to the repository object
  async deleteCardNumber(cardNumber: string): Promise<boolean> {
    try {
      const result = await db.query(
        `DELETE FROM card_numbers 
         WHERE card_number = $1 
         AND status = 'available'
         RETURNING card_number`,
        [cardNumber]
      );
      
      return (result?.rowCount ?? 0) > 0;
    } catch (error) {
      console.error(`Error deleting card number ${cardNumber}:`, error);
      throw error;
    }
  },
};

export default cardNumberRepository;
