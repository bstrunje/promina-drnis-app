import db from '../utils/db.js';

interface CardNumberResult {
  id: number;
  card_number: string;
  status: 'available' | 'assigned';
  assigned_at?: Date;
  member_id?: number;
}

const cardNumberRepository = {
  // Dohvati sve istinski dostupne brojeve kartica
  async getAvailable(): Promise<string[]> {
    try {
      // 1. Dohvati SVE brojeve kartica iz glavne tablice
      const allNumbersResult = await db.query<{ card_number: string }>(
        `SELECT card_number FROM card_numbers ORDER BY card_number ASC`
      );
      const allNumbers = allNumbersResult.rows.map(row => row.card_number);

      // 2. Dohvati sve POTROŠENE brojeve (npr. oštećene, izgubljene)
      const consumedNumbersResult = await db.query<{ card_number: string }>(
        `SELECT card_number FROM consumed_card_numbers`
      );
      // Koristimo Set za puno bržu pretragu
      const consumedNumbers = new Set(consumedNumbersResult.rows.map(row => row.card_number));

      // 3. Dohvati sve brojeve kartica koji su već dodijeljeni članovima iz ispravne tablice
      const assignedNumbersResult = await db.query<{ card_number: string }>('SELECT card_number FROM membership_details WHERE card_number IS NOT NULL');
      const assignedNumbers = new Set(assignedNumbersResult.rows.map(row => row.card_number));

      // 4. Filtriraj dostupne brojeve
      const availableNumbers = allNumbers.filter(num => 
        !consumedNumbers.has(num) && !assignedNumbers.has(num)
      );
      
      return availableNumbers;
    } catch (error) {
      console.error("Greška u getAvailable (dostupne kartice):", error);
      return [];
    }
  },

  /**
   * Označi broj kartice kao potrošen (dodaj u consumed_card_numbers)
   * @param cardNumber broj kartice koji se troši
   * @param memberId ID člana kojem je kartica bila dodijeljena
   * @param issuedAt datum kada je kartica izdana (opcionalno, koristi trenutni ako nije proslijeđen)
   * @param consumedAt datum kada je potrošena (opcionalno, koristi trenutni ako nije proslijeđen)
   */
  async markCardNumberConsumed(cardNumber: string, memberId: number, issuedAt?: Date, consumedAt?: Date): Promise<void> {
    // Provjeri postoji li već zapis
    const existing = await db.query<{ id: number }>(
      `SELECT id FROM consumed_card_numbers WHERE card_number = $1`,
      [cardNumber]
    );
    if (existing.rows.length > 0) {
      // Već je potrošena
      return;
    }
    // Koristi proslijeđeni issuedAt ili trenutni datum
    const issued = issuedAt || new Date();
    // Unesi u consumed_card_numbers
    await db.query(
      `INSERT INTO consumed_card_numbers (card_number, member_id, issued_at, consumed_at) VALUES ($1, $2, $3, $4)`,
      [cardNumber, memberId, issued, consumedAt || new Date()]
    );
    // Ažuriraj status u card_numbers (ako postoji)
    await db.query(
      `UPDATE card_numbers SET status = 'consumed', member_id = NULL, assigned_at = NULL WHERE card_number = $1`,
      [cardNumber]
    );
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
    status: 'available' | 'assigned';
    member_id?: number;
    member_name?: string;
  }[]> {
    try {
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
      
      return result.rows;
    } catch (error) {
      console.error("Error in getAllCardNumbers:", error);
      throw error;
    }
  },

  // Add this method to find member by card number
  async findMemberByCardNumber(cardNumber: string): Promise<{
    member_id: number;
    full_name: string;
  } | null> {
    const result = await db.query(
      `SELECT m.member_id, m.full_name
       FROM members m
       JOIN membership_details md ON m.member_id = md.member_id
       WHERE md.card_number = $1`,
      [cardNumber]
    );
    
    // Sigurna provjera za null/undefined s opcionalnim chainanjem i nullish coalescing
    const rowCount = result?.rowCount ?? 0;
    return rowCount > 0 ? result.rows[0] : null;
  },

  // Optimizirana metoda za sinkronizaciju statusa brojeva iskaznica korištenjem batch operacija
  async syncCardNumberStatus(): Promise<{ updated: number; message: string }> {
    console.log("Starting card number status synchronization...");
    
    // Koristi transakciju za atomarnu operaciju
    return await db.transaction(async (client) => {
      // 1. Najprije postavi sve na "available" - ovo će omogućiti da ispravno ažuriramo statuse
      // To je sigurno jer ćemo u sljedećem koraku ažurirati statuse dodijeljenih brojeva
      await client.query(`
        UPDATE card_numbers 
        SET status = 'available', member_id = NULL, assigned_at = NULL
      `);
      
      console.log("Reset all card numbers to available status...");
      
      // 2. Dohvati sve kartice koje su dodijeljene u membership_details
      const assignedResult = await client.query<{ card_number: string, member_id: number }>(
        `SELECT member_id, card_number 
         FROM membership_details 
         WHERE card_number IS NOT NULL`
      );
      
      const assignedCards = assignedResult.rows;
      console.log(`Found ${assignedCards.length} assigned cards in membership_details`);
      
      if (assignedCards.length === 0) {
        return { updated: 0, message: "No card numbers needed synchronization" };
      }
      
      // 3. Optimizirano: Podijeli u dva koraka - update postojećih i insert novih
      // 3.1 Prvo dohvati sve postojeće brojeve kartica
      const existingCardNumbers = await client.query<{ card_number: string }>(
        `SELECT card_number FROM card_numbers WHERE card_number IN (
          ${assignedCards.map((_, idx) => `$${idx + 1}`).join(', ')}
        )`,
        assignedCards.map(card => card.card_number)
      );
      
      // Kreiraj set postojećih brojeva za brzo pretraživanje
      const existingCardSet = new Set(
        existingCardNumbers.rows.map(row => row.card_number)
      );
      
      // 3.2 Podijeli na postojeće za update i nove za insert
      const cardsToUpdate = [];
      const cardsToInsert = [];
      
      for (const card of assignedCards) {
        if (existingCardSet.has(card.card_number)) {
          cardsToUpdate.push(card);
        } else {
          cardsToInsert.push(card);
        }
      }
      
      console.log(`Cards to update: ${cardsToUpdate.length}, Cards to insert: ${cardsToInsert.length}`);
      
      // 3.3 Batch update postojećih kartica
      if (cardsToUpdate.length > 0) {
        // Pripremi parametre za batch update
        const updateParams: (string | number)[] = [];
        const updatePlaceholders: string[] = [];
        
        cardsToUpdate.forEach((card, idx) => {
          updateParams.push(card.card_number, card.member_id);
          updatePlaceholders.push(`($${idx*2+1}, $${idx*2+2})`);
        });
        
        // Izvrši batch update
        await client.query(`
          WITH card_data (card_number, member_id) AS (
            VALUES ${updatePlaceholders.join(', ')}
          )
          UPDATE card_numbers c
          SET 
            status = 'assigned', 
            member_id = cd.member_id, 
            assigned_at = CURRENT_TIMESTAMP
          FROM card_data cd
          WHERE c.card_number = cd.card_number
        `, updateParams);
        
        console.log(`Updated ${cardsToUpdate.length} existing card numbers in batch operation`);
      }
      
      // 3.4 Batch insert novih kartica
      if (cardsToInsert.length > 0) {
        // Pripremi parametre za batch insert
        const insertParams: (string | number)[] = [];
        const insertPlaceholders: string[] = [];
        
        cardsToInsert.forEach((card, idx) => {
          insertParams.push(card.card_number, card.member_id);
          insertPlaceholders.push(`($${idx*2+1}, 'assigned', $${idx*2+2}, CURRENT_TIMESTAMP)`);
        });
        
        // Izvrši batch insert
        await client.query(`
          INSERT INTO card_numbers (card_number, status, member_id, assigned_at)
          VALUES ${insertPlaceholders.join(', ')}
        `, insertParams);
        
        console.log(`Inserted ${cardsToInsert.length} new card numbers in batch operation`);
      }
      
      const totalUpdated = cardsToUpdate.length + cardsToInsert.length;
      console.log(`Successfully synchronized ${totalUpdated} card number statuses`);
      
      return { 
        updated: totalUpdated,
        message: `Uspješno sinkronizirano ${totalUpdated} brojeva iskaznica` 
      };
    });
  },
  /**
   * Dohvati potrošene (consumed) brojeve kartica s imenom člana
   * @param search optional - string za pretragu po broju kartice ili imenu člana (case-insensitive, djelomično podudaranje)
   * @returns Lista potrošenih kartica s imenom člana
   */
  async getConsumedCardNumbers(search?: string): Promise<{
    card_number: string;
    member_id: number | null;
    member_name: string | null;
    issued_at: Date;
    consumed_at: Date;
  }[]> {
    try {
      // Pripremi uvjet za pretragu
      let whereClause = '';
      let params: any[] = [];
      if (search && search.trim() !== '') {
        whereClause = 'WHERE LOWER(c.card_number) LIKE $1 OR LOWER(m.full_name) LIKE $1';
        params.push(`%${search.toLowerCase()}%`);
      }
      const query = `
        SELECT c.card_number, c.member_id, m.full_name AS member_name, c.issued_at, c.consumed_at
        FROM consumed_card_numbers c
        LEFT JOIN members m ON c.member_id = m.member_id
        ${whereClause}
        ORDER BY c.consumed_at DESC, c.card_number ASC
      `;
      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Greška u getConsumedCardNumbers:', error);
      throw error;
    }
  },

};

export default cardNumberRepository;
