import db from '../utils/db.js';
import prisma from '../utils/prisma.js';

interface CardNumberResult {
  id: number;
  card_number: string;
  status: 'available' | 'assigned';
  assigned_at?: Date;
  member_id?: number;
}

const cardNumberRepository = {
  // OPTIMIZIRANA funkcija za dohvat dostupnih brojeva kartica - serverless friendly
  async getAvailable(): Promise<string[]> {
    try {
      console.log('[CARD-NUMBERS] Početak dohvata dostupnih brojeva kartica...');
      const startTime = Date.now();
      
      // KRITIČNA OPTIMIZACIJA: Paralelni Prisma upiti umjesto sekvencijalnih db.query
      const [allNumbers, consumedNumbers, assignedNumbers] = await Promise.allSettled([
        // 1. Dohvati SVE brojeve kartica iz glavne tablice
        prisma.cardNumber.findMany({
          select: { card_number: true },
          orderBy: { card_number: 'asc' }
        }),
        
        // 2. Dohvati sve POTROŠENE brojeve (npr. oštećene, izgubljene)
        prisma.consumedCardNumber.findMany({
          select: { card_number: true }
        }),
        
        // 3. Dohvati sve brojeve kartica koji su već dodijeljeni članovima
        prisma.membershipDetails.findMany({
          where: { card_number: { not: null } },
          select: { card_number: true }
        })
      ]);
      
      // Obradi rezultate s fallback vrijednostima
      const allNumbersList = allNumbers.status === 'fulfilled' ? allNumbers.value.map((n: {card_number: string}) => n.card_number) : [];
      const consumedNumbersSet = new Set(
        consumedNumbers.status === 'fulfilled' ? consumedNumbers.value.map((n: {card_number: string}) => n.card_number) : []
      );
      const assignedNumbersSet = new Set(
        assignedNumbers.status === 'fulfilled' ? assignedNumbers.value.map((n: {card_number: string | null}) => n.card_number).filter(Boolean) : []
      );

      // 4. Filtriraj dostupne brojeve
      const availableNumbers = allNumbersList.filter((num: string) => 
        !consumedNumbersSet.has(num) && !assignedNumbersSet.has(num)
      );
      
      const duration = Date.now() - startTime;
      console.log(`[CARD-NUMBERS] Pronađeno ${availableNumbers.length} dostupnih brojeva u ${duration}ms`);
      
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
    console.log(`[CARD-NUMBERS] Označavam karticu ${cardNumber} kao potrošenu...`);
    
    try {
      // OPTIMIZACIJA: Provjeri postoji li već zapis pomoću Prisma
      const existing = await prisma.consumedCardNumber.findFirst({
        where: { card_number: cardNumber },
        select: { id: true }
      });
      
      if (existing) {
        console.log(`[CARD-NUMBERS] Kartica ${cardNumber} je već označena kao potrošena`);
        return;
      }
      
      // Koristi proslijeđeni issuedAt ili trenutni datum
      const issued = issuedAt || new Date();
      const consumed = consumedAt || new Date();
      
      // PARALELNE operacije za bolje performanse
      await Promise.allSettled([
        // Unesi u consumed_card_numbers
        prisma.consumedCardNumber.create({
          data: {
            card_number: cardNumber,
            member_id: memberId,
            issued_at: issued,
            consumed_at: consumed
          }
        }),
        
        // Ažuriraj status u card_numbers (ako postoji)
        prisma.cardNumber.updateMany({
          where: { card_number: cardNumber },
          data: {
            status: 'consumed',
            member_id: null,
            assigned_at: null
          }
        })
      ]);
      
      console.log(`[CARD-NUMBERS] Kartica ${cardNumber} uspješno označena kao potrošena`);
    } catch (error) {
      console.error(`[CARD-NUMBERS] Greška pri označavanju kartice ${cardNumber}:`, error);
      throw error;
    }
  },
  
  // OPTIMIZIRANA funkcija za dodavanje jednog broja kartice
  async addSingle(cardNumber: string): Promise<void> {
    console.log(`[CARD-NUMBERS] Dodajem broj kartice ${cardNumber}...`);
    
    try {
      // OPTIMIZACIJA: Prisma upsert umjesto db.query
      await prisma.cardNumber.upsert({
        where: { card_number: cardNumber },
        update: {}, // Ne mijenjaj ako već postoji
        create: {
          card_number: cardNumber,
          status: 'available'
        }
      });
      
      console.log(`[CARD-NUMBERS] Broj kartice ${cardNumber} uspješno dodan`);
    } catch (error) {
      console.error(`[CARD-NUMBERS] Greška pri dodavanju kartice ${cardNumber}:`, error);
      throw error;
    }
  },
  
  // KRITIČNA OPTIMIZACIJA: Prisma batch operacije umjesto db.transaction
  async addRange(start: number, end: number, padLength: number): Promise<number> {
    console.log(`[CARD-NUMBERS] Dodajem raspon ${start}-${end} (padding: ${padLength})...`);
    const startTime = Date.now();
    
    try {
      // Pripremi sve brojeve kartica za batch insert
      const cardNumbers = [];
      for (let i = start; i <= end; i++) {
        const cardNumber = i.toString().padStart(padLength, '0');
        cardNumbers.push({
          card_number: cardNumber,
          status: 'available' as const
        });
      }
      
      console.log(`[CARD-NUMBERS] Pripravljeno ${cardNumbers.length} brojeva za batch insert...`);
      
      // OPTIMIZACIJA: Prisma createMany s skipDuplicates umjesto petlje
      const result = await prisma.cardNumber.createMany({
        data: cardNumbers,
        skipDuplicates: true // Preskoči duplikate umjesto ON CONFLICT
      });
      
      const duration = Date.now() - startTime;
      console.log(`[CARD-NUMBERS] Dodano ${result.count} novih brojeva u ${duration}ms`);
      
      return result.count;
    } catch (error) {
      console.error(`[CARD-NUMBERS] Greška pri dodavanju raspona ${start}-${end}:`, error);
      throw error;
    }
  },
  
  // OPTIMIZACIJA: Prisma update umjesto db.query
  async assignToMember(cardNumber: string, memberId: number): Promise<boolean> {
    console.log(`[CARD-NUMBERS] Dodjeljujem karticu ${cardNumber} članu ${memberId}...`);
    try {
      const result = await prisma.cardNumber.updateMany({
        where: {
          card_number: cardNumber,
          status: 'available'
        },
        data: {
          status: 'assigned',
          assigned_at: new Date(),
          member_id: memberId
        }
      });
      
      const success = result.count > 0;
      console.log(`[CARD-NUMBERS] Kartica ${cardNumber} ${success ? 'uspješno dodijeljena' : 'nije dostupna'} članu ${memberId}`);
      return success;
    } catch (error) {
      console.error(`[CARD-NUMBERS] Greška pri dodjeli kartice ${cardNumber} članu ${memberId}:`, error);
      return false;
    }
  },
  
  // OPTIMIZACIJA: Prisma update umjesto db.query
  async releaseCardNumber(cardNumber: string): Promise<boolean> {
    console.log(`[CARD-NUMBERS] Oslobođavam karticu ${cardNumber}...`);
    try {
      const result = await prisma.cardNumber.updateMany({
        where: {
          card_number: cardNumber,
          status: 'assigned'
        },
        data: {
          status: 'available',
          assigned_at: null,
          member_id: null
        }
      });
      
      const success = result.count > 0;
      console.log(`[CARD-NUMBERS] Kartica ${cardNumber} ${success ? 'uspješno oslobođena' : 'nije pronađena'}`);
      return success;
    } catch (error) {
      console.error(`[CARD-NUMBERS] Greška pri oslobođavanju kartice ${cardNumber}:`, error);
      return false;
    }
  },
  
  // OPTIMIZACIJA: Prisma findFirst umjesto db.query
  async isAvailable(cardNumber: string): Promise<boolean> {
    console.log(`[CARD-NUMBERS] Provjeravam dostupnost kartice ${cardNumber}...`);
    try {
      const card = await prisma.cardNumber.findFirst({
        where: {
          card_number: cardNumber,
          status: 'available'
        },
        select: { id: true }
      });
      
      const available = card !== null;
      console.log(`[CARD-NUMBERS] Kartica ${cardNumber} je ${available ? 'dostupna' : 'nedostupna'}`);
      return available;
    } catch (error) {
      console.error(`[CARD-NUMBERS] Greška pri provjeri dostupnosti kartice ${cardNumber}:`, error);
      return false;
    }
  },

  // OPTIMIZACIJA: Prisma delete umjesto db.query
  async deleteCardNumber(cardNumber: string): Promise<boolean> {
    console.log(`[CARD-NUMBERS] Brišem karticu ${cardNumber}...`);
    try {
      const result = await prisma.cardNumber.deleteMany({
        where: {
          card_number: cardNumber,
          status: 'available'
        }
      });
      
      const success = result.count > 0;
      console.log(`[CARD-NUMBERS] Kartica ${cardNumber} ${success ? 'uspješno obrisana' : 'nije pronađena ili nije dostupna'}`);
      return success;
    } catch (error) {
      console.error(`[CARD-NUMBERS] Greška pri brisanju kartice ${cardNumber}:`, error);
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
          COALESCE(ac.member_id, cn.member_id)::integer as member_id,
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
          ac.member_id::integer,
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

  // OPTIMIZACIJA: Prisma join upit umjesto db.query
  async findMemberByCardNumber(cardNumber: string): Promise<{
    member_id: number;
    full_name: string;
  } | null> {
    console.log(`[CARD-NUMBERS] Tražim člana po kartici ${cardNumber}...`);
    try {
      const membershipDetail = await prisma.membershipDetails.findFirst({
        where: { card_number: cardNumber },
        include: {
          member: {
            select: {
              member_id: true,
              full_name: true
            }
          }
        }
      });
      
      if (membershipDetail?.member) {
        const result = {
          member_id: membershipDetail.member.member_id,
          full_name: membershipDetail.member.full_name
        };
        console.log(`[CARD-NUMBERS] Pronađen član ${result.full_name} za karticu ${cardNumber}`);
        return result;
      }
      
      console.log(`[CARD-NUMBERS] Nije pronađen član za karticu ${cardNumber}`);
      return null;
    } catch (error) {
      console.error(`[CARD-NUMBERS] Greška pri traženju člana za karticu ${cardNumber}:`, error);
      return null;
    }
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
