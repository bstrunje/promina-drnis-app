import { Request, Response, NextFunction } from 'express';
import cardNumberRepository from '../repositories/cardnumber.repository.js';
import { getOrganizationId } from '../middleware/tenant.middleware.js';
import auditService from '../services/audit.service.js';
import prisma from "../utils/prisma.js";
import memberRepository from '../repositories/member.repository.js';
import bcrypt from 'bcrypt';
import membershipService from '../services/membership.service.js';
import passwordService from '../services/password.service.js';
import { tBackend } from '../utils/i18n.js';

const isDev = process.env.NODE_ENV === 'development';

const cardNumberController = {
  // Get all available card numbers
  async getAvailable(req: Request, res: Response, _next: NextFunction): Promise<void> {
    const locale = req.locale;
    if (isDev) console.log("Fetching available card numbers - user role:", req.user?.role);
    try {
      const organizationId = getOrganizationId(req);
      const availableNumbers = await cardNumberRepository.getAvailable(organizationId);
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
    const locale = req.locale;
    try {
      const { cardNumber } = req.body;
      
      if (!cardNumber || typeof cardNumber !== 'string') {
        return res.status(400).json({ 
          code: 'CARDNUM_INVALID_INPUT', 
          message: tBackend('cardnumbers.invalid_input', locale) 
        });
      }
      
      const organizationId = getOrganizationId(req);
      
      // Get current card number length setting
      const settings = await prisma.systemSettings.findFirst({
        where: { organization_id: organizationId }
      });
      
      const cardNumberLength = settings?.cardNumberLength || 5;
      
      // Validate card number format
      if (cardNumber.length !== cardNumberLength) {
        return res.status(400).json({ 
          code: 'CARDNUM_LENGTH_INVALID',
          message: tBackend('validations.invalid_oib', locale, { length: cardNumberLength })
        });
      }
      await cardNumberRepository.addSingle(organizationId, cardNumber);
      
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
    const locale = req.locale;
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
      
      const organizationId = getOrganizationId(req);
      
      // Get current card number length setting
      const settings = await prisma.systemSettings.findFirst({
        where: { organization_id: organizationId }
      });
      
      const cardNumberLength = settings?.cardNumberLength || 5;
      const added = await cardNumberRepository.addRange(organizationId, start, end, cardNumberLength);
      
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
    const locale = req.locale;
    try {
      const { cardNumber } = req.params;
      
      if (!cardNumber) {
        return res.status(400).json({ 
          code: 'CARDNUM_MISSING_PARAM', 
          message: tBackend('cardnumbers.missing_param', locale) 
        });
      }
      
      const organizationId = getOrganizationId(req);
      const deleted = await cardNumberRepository.deleteCardNumber(organizationId, cardNumber);
      
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
    const locale = req.locale;
    if (isDev) console.log("Fetching all card numbers - user role:", req.user?.role);
    try {
      const organizationId = getOrganizationId(req);
      const allCardNumbers = await cardNumberRepository.getAllCardNumbers(organizationId);
      
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
    const locale = req.locale;
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
    const locale = req.locale;
    try {
      // Provjeri administratorska prava
      const user = req.user;
      if (!user || !['member_administrator', 'member_superuser'].includes(user.role)) {
        return res.status(403).json({
          code: 'INSUFFICIENT_PERMISSIONS',
          message: tBackend('cardnumbers.insufficient_permissions', locale),
        });
      }
      const organizationId = getOrganizationId(req);
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const consumedCards = await cardNumberRepository.getConsumedCardNumbers(organizationId, search);
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
    const locale = req.locale;
    try {
      const { memberId } = req.params;
      const { cardNumber } = req.body;

      const organizationId = getOrganizationId(req);

      // Dohvati postavke sustava za validaciju duljine broja kartice
      const settings = await prisma.systemSettings.findFirst({
        where: { organization_id: organizationId }
      });
      const cardNumberLength = settings?.cardNumberLength || 5;

      // Dinamička validacija broja iskaznice prema stavkama
      const cardNumberRegex = new RegExp(`^\\d{${cardNumberLength}}$`);
      if (!cardNumberRegex.test(cardNumber)) {
        return res.status(400).json({
          code: 'CARDNUM_FORMAT_INVALID', 
          message: tBackend('cardnumbers.card_format_invalid', locale, { length: cardNumberLength }) 
        });
      }

      const member = await memberRepository.findById(organizationId, parseInt(memberId));
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

      // Dozvoljeno je dodijeliti karticu i 'pending' i 'registered' članovima
      // (npr. zamjena izgubljene/oštećene kartice)

      // Dohvati postavke sustava za generiranje lozinke (ako još nisu dohvaćene)
      const passwordStrategy = settings?.passwordGenerationStrategy;
      const passwordSeparator = settings?.passwordSeparator;
      const passwordCardDigits = settings?.passwordCardDigits;

      // Osiguraj da član ima ime prije generiranja lozinke
      if (!member.full_name) {
        return res.status(400).json({ 
          code: 'CARDNUM_MEMBER_NAME_MISSING', 
          message: tBackend('cardnumbers.member_name_missing', locale)
        });
      }

      // Automatski generiraj lozinku koristeći novi servis s prilagođenim opcijama
      const password = passwordService.generatePassword(
        passwordStrategy, 
        member, 
        cardNumber,
        { separator: passwordSeparator, cardDigits: passwordCardDigits }
      );
      const hashedPassword = await bcrypt.hash(password, 10);

      // Dohvati trenutni status markice prije promjene
      const currentDetails = await prisma.membershipDetails.findUnique({
        where: { member_id: parseInt(memberId) },
        select: { card_stamp_issued: true }
      });
      const currentStampStatus = currentDetails?.card_stamp_issued ?? false;

      // Pokreni transakciju za ažuriranje člana
      await prisma.$transaction(async (tx) => {
        // Ažuriraj podatke o članu - dodaj broj iskaznice
        // NAPOMENA: Zadržavamo postojeći status markice, ne resetiramo ga
        await membershipService.updateCardDetails(
          req,
          parseInt(memberId),
          cardNumber,
          currentStampStatus, // Zadrži trenutni status markice
          req.user?.id
        );

        // Ažuriraj samo lozinku člana
        // Status i registration_completed su već postavljeni u updateCardDetails() prema svim uvjetima
        await tx.member.update({
          where: {
            member_id: parseInt(memberId)
          },
          data: {
            password_hash: hashedPassword
          }
        });

        // Označi broj iskaznice kao dodijeljen (assigned)
        await tx.cardNumber.update({
          where: {
            organization_id_card_number: {
              organization_id: organizationId,
              card_number: cardNumber
            }
          },
          data: {
            status: 'assigned',
            member_id: parseInt(memberId)
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
        message: successMessage,
        generatedPassword: password // Vraćamo generirani password da ga admin vidi
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

  /**
   * Regeneriranje lozinke za člana (samo za RANDOM_8 strategiju)
   * Endpoint: POST /api/members/:memberId/regenerate-password
   */
  async regeneratePassword(
    req: Request<{ memberId: string }>,
    res: Response,
    _next: NextFunction
  ): Promise<Response> {
    const locale = req.locale;
    const organizationId = getOrganizationId(req);
    
    try {
      const memberId = parseInt(req.params.memberId, 10);
      
      if (!memberId || isNaN(memberId)) {
        return res.status(400).json({ 
          code: 'INVALID_MEMBER_ID',
          message: 'Invalid member ID'
        });
      }

      // Dohvati system settings
      const settings = await prisma.systemSettings.findFirst({
        where: { organization_id: organizationId }
      });
      
      // Provjeri da li je strategija RANDOM_8
      if (settings?.passwordGenerationStrategy !== 'RANDOM_8') {
        return res.status(400).json({ 
          code: 'INVALID_STRATEGY',
          message: 'Password regeneration is only available for RANDOM_8 strategy'
        });
      }

      // Dohvati člana
      const member = await prisma.member.findUnique({
        where: { member_id: memberId },
        include: {
          membership_details: true
        }
      });

      if (!member) {
        return res.status(404).json({ 
          code: 'MEMBER_NOT_FOUND',
          message: 'Member not found'
        });
      }

      // Za RANDOM_8 strategiju, kartica nije potrebna
      // Ali provjerimo da li je član platio članarinu
      if (!member.membership_details?.fee_payment_date) {
        return res.status(400).json({ 
          code: 'NO_MEMBERSHIP_FEE',
          message: 'Cannot generate password: member has not paid membership fee'
        });
      }

      // Generiraj novi random password (kartica nije potrebna za RANDOM_8)
      const newPassword = passwordService.generatePassword(
        'RANDOM_8',
        member,
        '' // Kartica nije potrebna za RANDOM_8
      );
      
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Ažuriraj password u bazi
      await prisma.member.update({
        where: { member_id: memberId },
        data: {
          password_hash: hashedPassword
        }
      });

      // Audit log
      const performerId = req.user?.id;
      if (performerId) {
        await auditService.logAction(
          'REGENERATE_PASSWORD',
          performerId,
          `Regenerated password for member: ${member.full_name}`,
          req,
          'success',
          memberId,
          req.user?.performer_type
        );
      }

      return res.status(200).json({ 
        message: 'Password regenerated successfully',
        generatedPassword: newPassword
      });
    } catch (error) {
      console.error('Error in regeneratePassword:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return res.status(500).json({
        code: 'REGENERATE_PASSWORD_FAILED',
        message: tBackend('errors.unexpected', locale),
        error: errorMessage
      });
    }
  },

};

export default cardNumberController;
