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

  // Modify the getAllCardNumbers method to check all tables for card assignment information
  async getAllCardNumbers(): Promise<{
    card_number: string;
    status: 'available' | 'assigned' | 'retired';
    member_id?: number;
    member_name?: string;
  }[]> {
    // Deep debug logging to diagnose issues
    console.log("Fetching all card numbers including assigned ones");
    
    try {
      // First, check if card 55559 exists at all
      const checkCard = await db.query(`
        SELECT * FROM card_numbers WHERE card_number = '55559'
      `);
      console.log("Card 55559 lookup:", checkCard.rows);

      // Also check membership_details for this card
      const checkMembership = await db.query(`
        SELECT m.member_id, m.full_name, md.* 
        FROM membership_details md
        JOIN members m ON md.member_id = m.member_id
        WHERE md.card_number = '55559'
      `);
      console.log("Membership details for 55559:", checkMembership.rows);

      // Main query - expand to check membership_details table as well
      const result = await db.query(`
        WITH assigned_cards AS (
          SELECT 
            md.card_number,
            md.member_id,
            m.full_name as member_name,
            'assigned' as source
          FROM 
            membership_details md
          JOIN 
            members m ON md.member_id = m.member_id
          WHERE 
            md.card_number IS NOT NULL AND md.card_number != ''
        )
        
        SELECT 
          cn.card_number, 
          CASE
            WHEN ac.card_number IS NOT NULL THEN 'assigned'
            WHEN cn.status = 'assigned' THEN 'assigned'
            ELSE cn.status
          END as status,
          COALESCE(ac.member_id, cn.member_id) as member_id,
          ac.member_name
        FROM 
          card_numbers cn
        LEFT JOIN 
          assigned_cards ac ON cn.card_number = ac.card_number
        
        UNION
        
        -- Include cards from membership_details that might not be in card_numbers
        SELECT 
          ac.card_number, 
          'assigned' as status,
          ac.member_id,
          ac.member_name
        FROM 
          assigned_cards ac
        LEFT JOIN 
          card_numbers cn ON ac.card_number = cn.card_number
        WHERE 
          cn.card_number IS NULL
        
        ORDER BY 
          status, card_number ASC
      `);
      
      // Log details about the results
      console.log(`Found ${result.rows.length} total card numbers`);
      console.log(`Available: ${result.rows.filter(c => c.status === 'available').length}`);
      console.log(`Assigned: ${result.rows.filter(c => c.status === 'assigned').length}`);
      
      if (result.rows.filter(c => c.status === 'assigned').length > 0) {
        console.log("Assigned card details:", 
          result.rows.filter(c => c.status === 'assigned').map(c => ({
            card_number: c.card_number, 
            member_id: c.member_id,
            member_name: c.member_name
          }))
        );
      }
      
      return result.rows;
    } catch (error) {
      console.error("Error in getAllCardNumbers:", error);
      throw error;
    }
  },

  // Add this method to find member by card number
  async findMemberByCardNumber(cardNumber: string) {
    const result = await db.query(`
      SELECT 
        m.member_id,
        m.full_name,
        m.email,
        m.status,
        md.card_number,
        md.card_stamp_issued
      FROM 
        members m
      JOIN 
        membership_details md ON m.member_id = md.member_id
      WHERE 
        md.card_number = $1
    `, [cardNumber]);
    
    return result.rows[0] || null;
  },
};

export default cardNumberRepository;
