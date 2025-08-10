import { Request, Response } from 'express';
import cardNumberRepository from '../repositories/cardnumber.repository.js';
import auditService from '../services/audit.service.js';
import prisma from "../utils/prisma.js";
import memberRepository from '../repositories/member.repository.js';
import bcrypt from 'bcrypt';
import membershipService from '../services/membership.service.js';
import { handleControllerError } from '../utils/controllerUtils.js';

const isDev = process.env.NODE_ENV === 'development';

const cardNumberController = {
  // Get all available card numbers
  async getAvailable(req: Request, res: Response): Promise<void> {
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
        message: 'Failed to fetch available card numbers',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },
  
  // Add a single card number
  async addSingle(req: Request, res: Response): Promise<void> {
    try {
      const { cardNumber } = req.body;
      
      if (!cardNumber || typeof cardNumber !== 'string') {
        res.status(400).json({ code: 'CARDNUM_INVALID_INPUT', message: 'Valid card number is required' });
        return;
      }
      
      // Get current card number length setting
      const settings = await prisma.systemSettings.findFirst({
        where: { id: "default" }
      });
      
      const cardNumberLength = settings?.cardNumberLength || 5;
      
      // Validate card number format
      if (cardNumber.length !== cardNumberLength) {
        res.status(400).json({ 
          code: 'CARDNUM_LENGTH_INVALID',
          message: `Card number must be ${cardNumberLength} characters long` 
        });
        return;
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
      
      res.status(201).json({ message: 'Card number added successfully' });
    } catch (error) {
      console.error('Error adding card number:', error);
      res.status(500).json({ code: 'CARDNUM_ADD_FAILED', message: 'Failed to add card number' });
    }
  },
  
  // Add a range of card numbers
  async addRange(req: Request, res: Response): Promise<void> {
    try {
      const { start, end } = req.body;
      
      if (typeof start !== 'number' || typeof end !== 'number') {
        res.status(400).json({ code: 'CARDNUM_RANGE_INVALID_INPUT', message: 'Valid start and end numbers are required' });
        return;
      }
      
      if (start > end) {
        res.status(400).json({ code: 'CARDNUM_RANGE_INVALID_ORDER', message: 'Start must be less than or equal to end' });
        return;
      }
      
      if (end - start > 1000) {
        res.status(400).json({ code: 'CARDNUM_RANGE_TOO_LARGE', message: 'Cannot add more than 1000 card numbers at once' });
        return;
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
      
      res.status(201).json({ message: `${added} card numbers added successfully` });
    } catch (error) {
      console.error('Error adding card number range:', error);
      res.status(500).json({ code: 'CARDNUM_RANGE_ADD_FAILED', message: 'Failed to add card number range' });
    }
  },

  // Delete a card number
  async deleteCardNumber(req: Request, res: Response): Promise<void> {
    try {
      const { cardNumber } = req.params;
      
      if (!cardNumber) {
        res.status(400).json({ code: 'CARDNUM_MISSING_PARAM', message: 'Card number is required' });
        return;
      }
      
      const deleted = await cardNumberRepository.deleteCardNumber(cardNumber);
      
      if (!deleted) {
        res.status(404).json({ code: 'CARDNUM_NOT_FOUND_OR_ASSIGNED', message: 'Card number not found or already assigned to a member' });
        return;
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
      
      res.status(200).json({ 
        message: 'Card number deleted successfully',
        cardNumber 
      });
    } catch (error) {
      console.error('Error deleting card number:', error);
      res.status(500).json({ code: 'CARDNUM_DELETE_FAILED', message: 'Failed to delete card number' });
    }
  },

  // Add this method to the controller
  async getAllCardNumbers(req: Request, res: Response): Promise<void> {
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
        message: 'Failed to fetch card numbers',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  // Nova metoda za sinkronizaciju statusa brojeva iskaznica
  async syncCardNumberStatus(req: Request, res: Response): Promise<void> {
    try {
      // Potrebna je admin/superuser razina pristupa
      if (req.user?.role !== 'member_administrator' && req.user?.role !== 'member_superuser') {
        res.status(403).json({ code: 'CARDNUM_FORBIDDEN_SYNC', message: 'Unauthorized. Only admins and superusers can sync card number status.' });
        return;
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
  async getConsumedCardNumbers(req: Request, res: Response): Promise<void> {
    try {
      // Provjeri administratorska prava
      if (req.user?.role !== 'member_administrator' && req.user?.role !== 'member_superuser') {
        res.status(403).json({ code: 'CARDNUM_FORBIDDEN_CONSUMED', message: 'Unauthorized. Only admins and superusers can access consumed card numbers.' });
        return;
      }
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const consumedCards = await cardNumberRepository.getConsumedCardNumbers(search);
      res.json(consumedCards);
    } catch (error) {
      console.error('Greška u getConsumedCardNumbers:', error);
      res.status(500).json({
        code: 'CARDNUM_FETCH_CONSUMED_FAILED',
        message: 'Neuspješno dohvaćanje potrošenih kartica',
        error: error instanceof Error ? error.message : 'Nepoznata greška'
      });
    }
  },

  async assignCardNumber(
    req: Request<{ memberId: string }>,
    res: Response
  ): Promise<void> {
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
        res.status(400).json({ code: 'CARDNUM_FORMAT_INVALID', message: `Card number must be exactly ${cardNumberLength} digits` });
        return;
      }

      // Dohvati podatke o članu
      const member = await memberRepository.findById(parseInt(memberId));
      if (!member) {
        res.status(404).json({ code: 'CARDNUM_MEMBER_NOT_FOUND', message: "Member not found" });
        return;
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
        res.status(400).json({ 
          code: 'CARDNUM_ALREADY_ASSIGNED',
          message: `Card number ${cardNumber} is already assigned to member: ${existingMember.full_name}`,
          existingMember: {
            member_id: existingMember.member_id,
            full_name: existingMember.full_name
          }
        });
        return;
      }

      // Provjeri je li član već registriran
      if (member.registration_completed) {
        res.status(400).json({ code: 'CARDNUM_ONLY_PENDING', message: "Can only assign card number for pending members" });
        return;
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

      if (req.user?.id) {
        await auditService.logAction(
          'ASSIGN_CARD_NUMBER',
          req.user.id,
          `Assigned card number ${cardNumber} to member ${member.full_name}`,
          req,
          'success',
          parseInt(memberId),
          req.user.performer_type
        );
      }

      res.status(200).json({ message: "Card number assigned and member registered successfully" });
    } catch (error) {
      handleControllerError(error, res);
    }
  },

};

export default cardNumberController;
