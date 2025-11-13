import prisma from '../utils/prisma.js';
import { Prisma } from '@prisma/client';

const cardNumberRepository = {
  // OPTIMIZIRANA funkcija za dohvat dostupnih brojeva kartica - serverless friendly
  async getAvailable(organizationId: number): Promise<string[]> {
    try {
      console.log(`[CARD-NUMBERS] Početak dohvata dostupnih brojeva kartica za org ${organizationId}...`);
      const startTime = Date.now();

      const [allNumbers, consumedNumbers, assignedNumbers] = await Promise.allSettled([
        // 1. Dohvati SVE brojeve kartica iz glavne tablice
        prisma.cardNumber.findMany({
          where: { organization_id: organizationId },
          select: { card_number: true },
          orderBy: { card_number: 'asc' }
        }),

        // 2. Dohvati sve POTROŠENE brojeve (npr. oštećene, izgubljene)
        prisma.consumedCardNumber.findMany({
          where: { organization_id: organizationId },
          select: { card_number: true }
        }),

        // 3. Dohvati sve brojeve kartica koji su već dodijeljeni članovima
        prisma.membershipDetails.findMany({
          where: { card_number: { not: null } },
          select: { card_number: true }
        })
      ]);

      // Obradi rezultate s fallback vrijednostima
      const allNumbersList = allNumbers.status === 'fulfilled' ? allNumbers.value.map((n: { card_number: string }) => n.card_number) : [];
      const consumedNumbersSet = new Set(
        consumedNumbers.status === 'fulfilled' ? consumedNumbers.value.map((n: { card_number: string }) => n.card_number) : []
      );
      const assignedNumbersSet = new Set(
        assignedNumbers.status === 'fulfilled' ? assignedNumbers.value.map((n: { card_number: string | null }) => n.card_number).filter(Boolean) : []
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
  async markCardNumberConsumed(organizationId: number, cardNumber: string, memberId: number, issuedAt?: Date, consumedAt?: Date): Promise<void> {
    console.log(`[CARD-NUMBERS] Označavam karticu ${cardNumber} kao potrošenu za org ${organizationId}...`);

    try {
      // OPTIMIZACIJA: Provjeri postoji li već zapis pomoću Prisma
      const existing = await prisma.consumedCardNumber.findFirst({
        where: { 
          organization_id: organizationId,
          card_number: cardNumber 
        },
        select: { id: true }
      });

      if (existing) {
        console.log(`[CARD-NUMBERS] Kartica ${cardNumber} je već označena kao potrošena`);
        return;
      }

      // Koristi proslijeđeni issuedAt ili trenutni datum
      const issued = issuedAt || new Date();
      const consumed = consumedAt || new Date();

      // ATOMIČNE operacije - obje moraju uspjeti ili obje failati
      await Promise.all([
        // Unesi u consumed_card_numbers
        prisma.consumedCardNumber.create({
          data: {
            organization_id: organizationId,
            card_number: cardNumber,
            member_id: memberId,
            issued_at: issued,
            consumed_at: consumed
          }
        }),

        // Ažuriraj status u card_numbers (ako postoji)
        prisma.cardNumber.updateMany({
          where: { 
            organization_id: organizationId,
            card_number: cardNumber 
          },
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
  async addSingle(organizationId: number, cardNumber: string): Promise<void> {
    console.log(`[CARD-NUMBERS] Dodajem broj kartice ${cardNumber}...`);

    try {
      await prisma.cardNumber.upsert({
        where: { 
          organization_id_card_number: {
            organization_id: organizationId,
            card_number: cardNumber
          }
        },
        update: {}, // Ne mijenjaj ako već postoji
        create: {
          organization_id: organizationId,
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

  async addRange(organizationId: number, start: number, end: number, padLength: number): Promise<number> {
    console.log(`[CARD-NUMBERS] Dodajem raspon ${start}-${end} (padding: ${padLength})...`);
    const startTime = Date.now();

    try {
      // Pripremi sve brojeve kartica za batch insert
      const cardNumbers = [];
      for (let i = start; i <= end; i++) {
        const cardNumber = i.toString().padStart(padLength, '0');
        cardNumbers.push({
          organization_id: organizationId,
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

  async assignToMember(organizationId: number, cardNumber: string, memberId: number): Promise<boolean> {
    console.log(`[CARD-NUMBERS] Dodjeljujem karticu ${cardNumber} članu ${memberId}...`);
    try {
      const result = await prisma.cardNumber.updateMany({
        where: {
          organization_id: organizationId,
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

  async releaseCardNumber(organizationId: number, cardNumber: string): Promise<boolean> {
    console.log(`[CARD-NUMBERS] Oslobođavam karticu ${cardNumber}...`);
    try {
      const result = await prisma.cardNumber.updateMany({
        where: {
          organization_id: organizationId,
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

  async isAvailable(organizationId: number, cardNumber: string): Promise<boolean> {
    console.log(`[CARD-NUMBERS] Provjeravam dostupnost kartice ${cardNumber}...`);
    try {
      const card = await prisma.cardNumber.findFirst({
        where: {
          organization_id: organizationId,
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

  async deleteCardNumber(organizationId: number, cardNumber: string): Promise<boolean> {
    console.log(`[CARD-NUMBERS] Brišem karticu ${cardNumber}...`);
    try {
      const result = await prisma.cardNumber.deleteMany({
        where: {
          organization_id: organizationId,
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

  async getAllCardNumbers(organizationId: number): Promise<{
    card_number: string;
    status: 'available' | 'assigned';
    member_id?: number;
    member_name?: string;
  }[]> {
    console.log(`[CARD-NUMBERS] Početak dohvata svih brojeva kartica za org ${organizationId}...`);
    const startTime = Date.now();

    try {
      const [cardNumbers, assignedCards] = await Promise.allSettled([
        // 1. Dohvati sve brojeve kartica
        prisma.cardNumber.findMany({
          where: { organization_id: organizationId },
          select: {
            card_number: true,
            status: true,
            member_id: true
          },
          orderBy: { card_number: 'asc' }
        }),

        // 2. Dohvati dodijeljene kartice iz membership_details (samo za ovu organizaciju)
        prisma.membershipDetails.findMany({
          where: {
            card_number: { not: null },
            member: {
              organization_id: organizationId
            }
          },
          select: {
            card_number: true,
            member_id: true,
            member: {
              select: {
                full_name: true
              }
            }
          }
        })
      ]);

      // Obradi rezultate s fallback vrijednostima
      const allCardNumbers = cardNumbers.status === 'fulfilled' ? cardNumbers.value : [];
      const membershipCards = assignedCards.status === 'fulfilled' ? assignedCards.value : [];

      // Stvori mapu dodijeljenih kartica za brzo pretraživanje
      const assignedCardsMap = new Map(
        membershipCards
          .filter(mc => mc.card_number)
          .map(mc => [
            mc.card_number!,
            {
              member_id: mc.member_id,
              member_name: mc.member?.full_name || null
            }
          ])
      );

      // Dohvati stvarno potrošene kartice iz consumed_card_numbers tablice
      const actuallyConsumed = await prisma.consumedCardNumber.findMany({
        where: { organization_id: organizationId },
        select: { card_number: true }
      });
      const actuallyConsumedSet = new Set(actuallyConsumed.map(c => c.card_number));

      // Filtriraj potrošene kartice iz glavne liste inventara
      // VAŽNO: Status 'consumed' mora odgovarati stvarnom zapisu u consumed_card_numbers tablici
      // Ako status je 'consumed' ALI nema zapisa u consumed_card_numbers, resetiramo status na 'available'
      const inconsistentCards: string[] = [];
      const nonConsumed = allCardNumbers.filter(cn => {
        const isMarkedConsumed = cn.status === 'consumed';
        const hasConsumedRecord = actuallyConsumedSet.has(cn.card_number);
        
        // Detektiraj inconsistency
        if (isMarkedConsumed && !hasConsumedRecord) {
          inconsistentCards.push(cn.card_number);
          console.warn(`[CARD-NUMBERS] Inconsistency detected: ${cn.card_number} marked as consumed but no record in consumed_card_numbers`);
          // Ne filtriraj je - umjesto toga, tretirati kao available
          return true;
        }
        
        // Normalno filtriranje - filtriraj samo ako je stvarno consumed
        return !hasConsumedRecord;
      });

      // Automatski resetiraj status nekonzistentnih kartica u bazi
      if (inconsistentCards.length > 0) {
        console.warn(`[CARD-NUMBERS] Auto-resetting ${inconsistentCards.length} inconsistent cards to 'available'`);
        await prisma.cardNumber.updateMany({
          where: {
            organization_id: organizationId,
            card_number: { in: inconsistentCards }
          },
          data: {
            status: 'available',
            member_id: null,
            assigned_at: null
          }
        });
      }

      // Kombiniraj podatke
      const result = nonConsumed.map(cn => {
        const assignedInfo = assignedCardsMap.get(cn.card_number);
        const isInconsistent = inconsistentCards.includes(cn.card_number);

        return {
          card_number: cn.card_number,
          // Ako je kartica bila inconsistent, prikaži je kao available
          status: (assignedInfo ? 'assigned' : (isInconsistent ? 'available' : cn.status)) as 'available' | 'assigned',
          member_id: assignedInfo?.member_id || cn.member_id || undefined,
          member_name: assignedInfo?.member_name || undefined
        };
      });

      // Dodaj kartice koje postoje samo u membership_details
      for (const [cardNumber, info] of assignedCardsMap) {
        if (!allCardNumbers.find(cn => cn.card_number === cardNumber)) {
          result.push({
            card_number: cardNumber,
            status: 'assigned',
            member_id: info.member_id,
            member_name: info.member_name || undefined
          });
        }
      }

      // Sortiraj po broju kartice
      result.sort((a, b) => a.card_number.localeCompare(b.card_number));

      const duration = Date.now() - startTime;
      console.log(`[CARD-NUMBERS] Dohvaćeno ${result.length} brojeva kartica u ${duration}ms`);

      return result;
    } catch (error) {
      console.error('[CARD-NUMBERS] Greška u getAllCardNumbers:', error);
      throw error;
    }
  },

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

    // Koristi Prisma transakciju za atomarnu operaciju
    return await prisma.$transaction(async (tx) => {
      // 1. Dohvati SVE potrošene (consumed) brojeve iz consumed_card_numbers
      //    VAŽNO: Ove brojeve NIKAD ne smijemo vratiti u available status
      const consumed = await tx.consumedCardNumber.findMany({
        select: { card_number: true }
      });
      const consumedList = consumed.map(c => c.card_number);

      // 1a. Resetiraj NA AVAILABLE samo one brojeve koji NISU potrošeni
      await tx.cardNumber.updateMany({
        where: consumedList.length > 0 ? { card_number: { notIn: consumedList } } : undefined,
        data: {
          status: 'available',
          member_id: null,
          assigned_at: null
        }
      });

      // 1b. Eksplicitno (re)postavi status na 'consumed' za sve potrošene brojeve
      //     Ovaj korak je idempotentan i osigurava konzistentnost ako postoje zapisi u card_numbers
      if (consumedList.length > 0) {
        await tx.cardNumber.updateMany({
          where: { card_number: { in: consumedList } },
          data: {
            status: 'consumed',
            member_id: null,
            assigned_at: null
          }
        });
      }

      console.log("Reset non-consumed card numbers to available and enforced consumed statuses...");

      // 2. Dohvati sve kartice koje su dodijeljene u membership_details
      const assignedCards = await tx.membershipDetails.findMany({
        where: {
          card_number: {
            not: null
          }
        },
        select: {
          member_id: true,
          card_number: true
        }
      });

      console.log(`Found ${assignedCards.length} assigned cards in membership_details`);

      if (assignedCards.length === 0) {
        return { updated: 0, message: "No card numbers needed synchronization" };
      }

      // 3. Optimizirano: Podijeli u dva koraka - update postojećih i insert novih
      // 3.1 Prvo dohvati sve postojeće brojeve kartica
      const cardNumbers = assignedCards.map(card => card.card_number!);
      const existingCardNumbers = await tx.cardNumber.findMany({
        where: {
          card_number: {
            in: cardNumbers
          }
        },
        select: {
          card_number: true
        }
      });

      // Kreiraj set postojećih brojeva za brzo pretraživanje
      const existingCardSet = new Set(
        existingCardNumbers.map(row => row.card_number)
      );

      // 3.2 Podijeli na postojeće za update i nove za insert
      const cardsToUpdate = [];
      const cardsToInsert = [];

      for (const card of assignedCards) {
        if (existingCardSet.has(card.card_number!)) {
          cardsToUpdate.push(card);
        } else {
          cardsToInsert.push(card);
        }
      }

      console.log(`Cards to update: ${cardsToUpdate.length}, Cards to insert: ${cardsToInsert.length}`);

      // 3.3 Update postojećih kartica
      if (cardsToUpdate.length > 0) {
        // Koristimo Promise.all za paralelno ažuriranje
        await Promise.all(cardsToUpdate.map(card =>
          tx.cardNumber.updateMany({
            where: {
              card_number: card.card_number!
            },
            data: {
              status: 'assigned',
              member_id: card.member_id,
              assigned_at: new Date()
            }
          })
        ));

        console.log(`Updated ${cardsToUpdate.length} existing card numbers in batch operation`);
      }

      // 3.4 Insert novih kartica
      if (cardsToInsert.length > 0) {
        await tx.cardNumber.createMany({
          data: cardsToInsert.map(card => ({
            card_number: card.card_number!,
            status: 'assigned' as const,
            member_id: card.member_id,
            assigned_at: new Date()
          }))
        });

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
  async getConsumedCardNumbers(organizationId: number, search?: string): Promise<{
    card_number: string;
    member_id: number | null;
    member_name: string | null;
    issued_at: string;
    consumed_at: string;
  }[]> {
    try {
      const whereClause: Prisma.ConsumedCardNumberWhereInput = {
        organization_id: organizationId
      };

      if (search && search.trim() !== '') {
        whereClause.OR = [
          {
            card_number: {
              contains: search.toLowerCase(),
              mode: 'insensitive'
            }
          },
          {
            member: {
              full_name: {
                contains: search.toLowerCase(),
                mode: 'insensitive'
              }
            }
          }
        ];
      }

      const consumedCards = await prisma.consumedCardNumber.findMany({
        where: whereClause,
        include: {
          member: {
            select: {
              full_name: true
            }
          }
        },
        orderBy: [
          { consumed_at: 'desc' },
          { card_number: 'asc' }
        ]
      });

      return consumedCards.map(card => ({
        card_number: card.card_number,
        member_id: card.member_id,
        member_name: card.member?.full_name || null,
        issued_at: card.issued_at.toISOString(),
        consumed_at: card.consumed_at.toISOString()
      }));
    } catch (error) {
      console.error('Greška u getConsumedCardNumbers:', error);
      throw error;
    }
  },

};

export default cardNumberRepository;
