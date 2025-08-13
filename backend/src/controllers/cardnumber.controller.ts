import { Request, Response, NextFunction } from 'express';
import cardNumberRepository from '../repositories/cardnumber.repository.js';
import auditService from '../services/audit.service.js';
import prisma from "../utils/prisma.js";
import memberRepository from '../repositories/member.repository.js';
import bcrypt from 'bcrypt';
import membershipService from '../services/membership.service.js';
import { tBackend } from '../utils/i18n.js';

const isDev = process.env.NODE_ENV === 'development';

const cardNumberController = {
  // Get all available card numbers
  async getAvailable(req: Request, res: Response, _next: NextFunction): Promise<void> {
    const locale = req.locale || 'hr';
    if (isDev) console.log("Fetching available card numbers - user role:", req.user?.role);
    try {
      const availableNumbers = await cardNumberRepository.getAvailable();
      if (isDev) console.log(`Found ${availableNumbers.length} available card numbers:`, availableNumbers);
      
      // Always return an array
      res.json(availableNumbers || []);
    } catch (error) {
      console.error('Error fetching available card numbers:', error);
      res.status(500).json({
        code: 'CARDNUM_FETCH_AVAILABLE_FAILED',
        message: tBackend('cardnumbers.fetch_failed', locale),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },
  
  // Add a single card number
  async addSingle(req: Request, res: Response, _next: NextFunction): Promise<Response | void> {
    const locale = req.locale || 'hr';
    try {
      const { cardNumber } = req.body;
      
      if (!cardNumber || typeof cardNumber !== 'string') {
        return res.status(400).json({ 
          code: 'CARDNUM_INVALID_INPUT', 
          message: tBackend('cardnumbers.invalid_input', locale) 
        });
      }
      
      // Get current card number length setting
      const settings = await prisma.systemSettings.findFirst({
        where: { id: "default" }
      });
      
      const cardNumberLength = settings?.cardNumberLength || 5;
      
      // Validate card number format
      if (cardNumber.length !== cardNumberLength) {
        return res.status(400).json({ 
          code: 'CARDNUM_LENGTH_INVALID',
          message: tBackend('validations.invalid_oib', locale, { length: cardNumberLength })
        });
      }
      
      await cardNumberRepository.addSingle(cardNumber);
      
      await auditService.logAction(
        'CARD_NUMBER_ADDED',
        req.user?.id || null,
        `Added card number: ${cardNumber}`,
        req,
        'success',
        undefined
        // performer_type se neće prosljeđivati - auditService će koristiti getPerformerType
      );
      
      return res.status(201).json({ 
        message: tBackend('cardnumbers.add_success', locale) 
      });
    } catch (error) {
      console.error('Error adding card number:', error);
      return res.status(500).json({ 
        code: 'CARDNUM_ADD_FAILED', 
        message: tBackend('errors.unexpected', locale) 
      });
    }
  },
  
  // Add a range of card numbers
  async addRange(req: Request, res: Response, _next: NextFunction): Promise<Response | void> {
    const locale = req.locale || 'hr';
    try {
      const { start, end } = req.body;
      
      if (typeof start !== 'number' || typeof end !== 'number') {
        return res.status(400).json({ 
          code: 'CARDNUM_RANGE_INVALID_INPUT', 
          message: tBackend('cardnumbers.range_invalid_input', locale) 
        });
      }
      
      if (start > end) {
        return res.status(400).json({ 
          code: 'CARDNUM_RANGE_INVALID_ORDER', 
          message: tBackend('cardnumbers.range_invalid_order', locale) 
        });
      }
      
      if (end - start > 1000) {
        return res.status(400).json({ 
          code: 'CARDNUM_RANGE_TOO_LARGE', 
          message: tBackend('cardnumbers.range_too_large', locale) 
        });
      }
      
      // Get current card number length setting
      const settings = await prisma.systemSettings.findFirst({
        where: { id: "default" }
      });
      
      const cardNumberLength = settings?.cardNumberLength || 5;
      
      const added = await cardNumberRepository.addRange(start, end, cardNumberLength);
      
      await auditService.logAction(
        'CARD_NUMBER_RANGE_ADDED',
        req.user?.id || null,
        `Added card number range: ${start} to ${end} (${added} added)`,
        req,
        'success',
        undefined
        // performer_type se neće prosljeđivati - auditService će koristiti getPerformerType
      );
      
      return res.status(201).json({ 
        message: tBackend('cardnumbers.add_range_success', locale, { count: added }) 
      });
    } catch (error) {
      console.error('Error adding card number range:', error);
      return res.status(500).json({ 
        code: 'CARDNUM_RANGE_ADD_FAILED', 
        message: tBackend('errors.unexpected', locale) 
      });
    }
  },

  // Delete a card number
  async deleteCardNumber(req: Request, res: Response, _next: NextFunction): Promise<Response | void> {
    const locale = req.locale || 'hr';
    try {
      const { cardNumber } = req.params;
      
      if (!cardNumber) {
        return res.status(400).json({ 
          code: 'CARDNUM_MISSING_PARAM', 
          message: tBackend('cardnumbers.missing_param', locale) 
        });
      }
      
      const deleted = await cardNumberRepository.deleteCardNumber(cardNumber);
      
      if (!deleted) {
        return res.status(404).json({ 
          code: 'CARDNUM_NOT_FOUND_OR_ASSIGNED', 
          message: tBackend('cardnumbers.not_found_or_assigned', locale) 
        });
      }
      
      const performerId = req.user?.id || null;

      await auditService.logAction(
        'CARD_NUMBER_DELETED',
        performerId,
        `Deleted card number: ${cardNumber}`,
        req,
        'success',
        undefined // affected_member
        // performer_type se neće prosljeđivati - auditService će koristiti getPerformerType
      );
      
      return res.status(200).json({ 
        message: tBackend('cardnumbers.delete_success', locale),
        cardNumber 
      });
    } catch (error) {
      console.error('Error deleting card number:', error);
      return res.status(500).json({ 
        code: 'CARDNUM_DELETE_FAILED', 
        message: tBackend('errors.unexpected', locale) 
      });
    }
  },

  // Get all card numbers with statistics
  async getAllCardNumbers(req: Request, res: Response, _next: NextFunction): Promise<void> {
    const locale = req.locale || 'hr';
    if (isDev) console.log("Fetching all card numbers - user role:", req.user?.role);
    try {
      const allCardNumbers = await cardNumberRepository.getAllCardNumbers();
      
      // Count statistics
      const available = allCardNumbers.filter(card => card.status === 'available').length;
      const assigned = allCardNumbers.filter(card => card.status === 'assigned').length;
      const total = allCardNumbers.length;
      
      if (isDev) console.log(`Found ${total} card numbers (${available} available, ${assigned} assigned)`);
      
      res.json({
        cards: allCardNumbers,
        stats: { 
          total,
          available,
          assigned
        }
      });
    } catch (error) {
      console.error('Error fetching all card numbers:', error);
      res.status(500).json({
        code: 'CARDNUM_FETCH_ALL_FAILED',
        message: tBackend('cardnumbers.fetch_all_failed', locale),
        error: error instanceof Error ? error.message : tBackend('errors.unexpected', locale)
      });
    }
  },

  // Nova metoda za sinkronizaciju statusa brojeva iskaznica
  async syncCardNumberStatus(req: Request, res: Response, _next: NextFunction): Promise<Response | void> {
    const locale = req.locale || 'hr';
    try {
      // Potrebna je admin/superuser razina pristupa
      if (req.user?.role !== 'member_administrator' && req.user?.role !== 'member_superuser') {
        return res.status(403).json({ 
          code: 'CARDNUM_FORBIDDEN_SYNC', 
          message: tBackend('cardnumbers.forbidden_sync', locale) 
        });
      }

      if (isDev) console.log("Starting card number status synchronization...");
      
      // Pozovi metodu u repozitoriju koja će sinkronizirati statuse
      const result = await cardNumberRepository.syncCardNumberStatus();
      
      // Logiraj operaciju
      await auditService.logAction(
        'SYNC_CARD_NUMBER_STATUS',
        req.user?.id || null,
        `Synchronized card number status. Updated ${result.updated} records.`,
        req,
        'success',
        undefined
        // performer_type se neće prosljeđivati - auditService će koristiti getPerformerType
      );
      
      res.status(200).json({ 
        message: 'Card number status synchronized successfully',
        updated: result.updated
      });
    } catch (error) {
      console.error('Error syncing card number status:', error);
      res.status(500).json({ 
        code: 'CARDNUM_SYNC_FAILED',
        message: 'Failed to sync card number status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },
  /**
   * Dohvati potrošene kartice (consumed) s imenom člana i podrškom za pretragu
   * GET /api/card-numbers/consumed?search=...
   * Dostupno samo adminima i superuserima
   */
  async getConsumedCardNumbers(req: Request, res: Response, _next: NextFunction): Promise<Response | void> {
    const locale = req.locale || 'hr';
    try {
      // Provjeri administratorska prava
      if (req.user?.role !== 'member_administrator' && req.user?.role !== 'member_superuser') {
        return res.status(403).json({ 
          code: 'CARDNUM_FORBIDDEN_CONSUMED', 
          message: tBackend('cardnumbers.forbidden_consumed', locale) 
        });
      }
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const consumedCards = await cardNumberRepository.getConsumedCardNumbers(search);
      return res.json(consumedCards);
    } catch (error) {
      console.error('Error in getConsumedCardNumbers:', error);
      return res.status(500).json({
        code: 'CARDNUM_FETCH_CONSUMED_FAILED',
        message: tBackend('cardnumbers.fetch_consumed_failed', locale),
        error: error instanceof Error ? error.message : tBackend('errors.unexpected', locale)
      });
    }
  },

  async assignCardNumber(
    req: Request<{ memberId: string }>,
    res: Response,
    _next: NextFunction
  ): Promise<Response | void> {
    const locale = req.locale || 'hr';
    try {
      const { memberId } = req.params;
      const { cardNumber } = req.body;

      // Dohvati postavke sustava za validaciju duljine broja kartice
      const settings = await prisma.systemSettings.findFirst({
        where: { id: 'default' }
      });
      const cardNumberLength = settings?.cardNumberLength || 5;

      // Dinamička validacija broja iskaznice prema postavkama
      const cardNumberRegex = new RegExp(`^\\d{${cardNumberLength}}$`);
      if (!cardNumberRegex.test(cardNumber)) {
        return res.status(400).json({ 
          code: 'CARDNUM_FORMAT_INVALID', 
          message: tBackend('cardnumbers.card_format_invalid', locale, { length: cardNumberLength }) 
        });
      }

      // Dohvati podatke o članu
      const member = await memberRepository.findById(parseInt(memberId));
      if (!member) {
        return res.status(404).json({ 
          code: 'CARDNUM_MEMBER_NOT_FOUND', 
          message: tBackend('cardnumbers.member_not_found', locale) 
        });
      }

      // Provjeri je li broj iskaznice već dodijeljen drugom članu
      const existingCardCheck = await prisma.membershipDetails.findFirst({
        where: {
          card_number: cardNumber,
          member_id: {
            not: parseInt(memberId)
          }
        },
        include: {
          member: {
            select: {
              member_id: true,
              full_name: true
            }
          }
        }
      });

      if (existingCardCheck) {
        const existingMember = existingCardCheck.member;
        return res.status(400).json({ 
          code: 'CARDNUM_ALREADY_ASSIGNED',
          message: tBackend('cardnumbers.member_has_card', locale, { cardNumber: existingMember.full_name }),
          existingMember: {
            member_id: existingMember.member_id,
            full_name: existingMember.full_name
          }
        });
      }

      // Provjeri je li član već registriran
      if (member.registration_completed) {
        return res.status(400).json({ 
          code: 'CARDNUM_ONLY_PENDING', 
          message: tBackend('cardnumbers.member_not_pending', locale) 
        });
      }

      // Dohvati postavke sustava za generiranje lozinke (ako još nisu dohvaćene)
      const settingsForPassword = settings || await prisma.systemSettings.findFirst({
        where: { id: 'default' }
      });
      const passwordCardNumberLength = settingsForPassword?.cardNumberLength || 5;

      // Automatski generiraj lozinku prema dogovorenom formatu s dinamičkom duljinom kartice
      const password = `${member.full_name}-isk-${cardNumber.padStart(passwordCardNumberLength, '0')}`;
      const hashedPassword = await bcrypt.hash(password, 10);

      // Pokreni transakciju za ažuriranje člana
      await prisma.$transaction(async (tx) => {
        // Ažuriraj podatke o članu - dodaj broj iskaznice
        await membershipService.updateCardDetails(
          parseInt(memberId),
          cardNumber,
          false, // Markica se NE izdaje automatski
          req.user?.id
        );

        // Ažuriraj lozinku člana i status registracije
        await tx.member.update({
          where: {
            member_id: parseInt(memberId)
          },
          data: {
            password_hash: hashedPassword,
            registration_completed: true,
            status: 'registered'
          }
        });

        // Označi broj iskaznice kao potrošen
        await tx.cardNumber.update({
          where: {
            card_number: cardNumber
          },
          data: {
            status: 'consumed'
          }
        });
      });

      // Log the action if user is authenticated
      const userId = req.user?.id;
      if (userId) { // This ensures userId is truthy (not 0, null, or undefined)
        try {
          // Use the user's performer_type if available, otherwise default to MEMBER
          const performerType = req.user?.performer_type || 'MEMBER' as const;
          
          // Ensure cardNumber is defined before using it in the audit message
          if (typeof cardNumber === 'undefined') {
            throw new Error('Broj iskazice nije definiran');
          }
          
          // Use hardcoded string for audit log (not translated)
          // Type assertion for member.full_name since it's required in the schema
          const auditMessage = `Dodijeljen broj iskazice ${cardNumber} članu ${member.full_name as string}`;
          
          await auditService.logAction(
            'ASSIGN_CARD_NUMBER',
            userId, // We've already checked it's truthy
            auditMessage,
            req,
            'success',
            parseInt(memberId),
            performerType
          );
        } catch (auditError) {
          console.error('Failed to log audit action:', auditError);
          // Continue with the response even if audit logging fails
        }
      }

      // Ensure cardNumber is defined and convert to string for the success message
      if (typeof cardNumber === 'undefined') {
        throw new Error(tBackend('cardnumbers.invalid_input', locale));
      }
      
      // Ensure member.full_name is treated as a string
      const successMessage = tBackend('cardnumbers.assign_success', locale, { 
        cardNumber: String(cardNumber), // Explicitly convert to string
        memberName: member.full_name as string // Type assertion since we know it's required in the schema
      });
      
      return res.status(200).json({ 
        message: successMessage
      });
    } catch (error) {
      console.error('Error in assignCardNumber:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error details:', errorMessage);
      
      return res.status(500).json({
        code: 'CARDNUM_ASSIGN_FAILED',
        message: tBackend('errors.unexpected', locale),
        error: errorMessage
      });
    }
  },

};

export default cardNumberController;
