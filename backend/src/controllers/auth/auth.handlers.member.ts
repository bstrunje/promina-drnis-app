import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import authRepository from '../../repositories/auth.repository.js';
import prisma from '../../utils/prisma.js';
import { tOrDefault } from '../../utils/i18n.js';
import passwordService from '../../services/password.service.js';
import { getOrganizationId } from '../../middleware/tenant.middleware.js';
const isDev = process.env.NODE_ENV === 'development';

export async function searchMembersHandler(req: Request, res: Response): Promise<void> {
  const locale = req.locale;
  try {
    const { searchTerm } = req.query;
    const userIP = req.ip || req.socket.remoteAddress || 'unknown';

    if (typeof searchTerm !== 'string' || searchTerm.length < 1) {
      res.status(400).json({ code: 'VALIDATION_ERROR', message: tOrDefault('common.errorsByCode.VALIDATION_ERROR', locale, 'Valid search term is required') });
      return;
    }

    if (isDev) console.log(`Member search request from IP ${userIP}: "${searchTerm}"`);

    if (searchTerm.includes("'") || searchTerm.includes(';') || searchTerm.includes('--')) {
      if (isDev) console.warn(`Potential SQL injection attempt from IP ${userIP}: "${searchTerm}"`);
      res.status(400).json({ code: 'VALIDATION_ERROR', message: tOrDefault('common.errorsByCode.VALIDATION_ERROR', locale, 'Invalid search term') });
      return;
    }

    const results = await authRepository.searchMembers(searchTerm);

    if (isDev) console.log(`Search for "${searchTerm}" returned ${results.length} results`);

    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: tOrDefault('common.errorsByCode.SERVER_ERROR', locale, error instanceof Error ? error.message : 'Error searching members'),
    });
  }
}

export async function assignCardNumberHandler(
  req: Request<Record<string, never>, Record<string, never>, { member_id: number; card_number: string }>,
  res: Response
): Promise<void> {
  const locale = req.locale;
  try {
    const { member_id, card_number } = req.body;
    const organizationId = getOrganizationId(req);

    const settings = await prisma.systemSettings.findFirst({
      where: { organization_id: organizationId },
    });
    const cardNumberLength = settings?.cardNumberLength || 5;

    const cardNumberRegex = new RegExp(`^\\d{${cardNumberLength}}$`);
    if (!cardNumberRegex.test(card_number)) {
      res.status(400).json({ code: 'CARDNUM_LENGTH_INVALID', message: tOrDefault('common.errorsByCode.CARDNUM_LENGTH_INVALID', locale, `Card number must be exactly ${cardNumberLength} digits`) });
      return;
    }

    const member = await authRepository.findUserById(member_id);
    if (!member) {
      res.status(404).json({ code: 'MEMBER_NOT_FOUND', message: tOrDefault('errorsByCode.MEMBER_NOT_FOUND', locale, 'Member not found') });
      return;
    }

    if (member.registration_completed) {
      res.status(400).json({ code: 'MEMBER_ONLY_PENDING', message: tOrDefault('common.errorsByCode.MEMBER_ONLY_PENDING', locale, 'Can only assign card number for pending members') });
      return;
    }

    // Osiguraj da član ima ime prije generiranja lozinke
    if (!member.full_name) {
      res.status(400).json({ 
        code: 'MEMBER_NAME_MISSING', 
        message: tOrDefault('errorsByCode.MEMBER_NAME_MISSING', locale, 'Member name is missing')
      });
      return;
    }

    const password = passwordService.generatePassword(
      settings?.passwordGenerationStrategy, 
      member, 
      card_number,
      { separator: settings?.passwordSeparator, cardDigits: settings?.passwordCardDigits }
    );
    console.log(`Generating password for member ${member_id} using strategy: ${settings?.passwordGenerationStrategy || 'default'}`);
    const hashedPassword = await bcrypt.hash(password, 10);

    await authRepository.updateMemberWithCardAndPassword(
      member_id,
      hashedPassword,
      card_number
    );

    res.json({
      message: tOrDefault('auth.success.AUTH_CARDNUM_ASSIGNED_OK', locale, 'Card number assigned and password generated successfully'),
      member_id,
      status: 'registered',
      card_number,
    });
  } catch (error) {
    console.error('Card number assignment error:', error);
    res.status(500).json({ code: 'CARDNUM_ASSIGN_FAILED', message: tOrDefault('common.errorsByCode.CARDNUM_ASSIGN_FAILED', locale, 'Error assigning card number') });
  }
}

export async function assignPasswordHandler(
  req: Request<Record<string, never>, Record<string, never>, { memberId: number; password: string }>,
  res: Response
): Promise<void> {
  const locale = req.locale;
  try {
    const { memberId, password } = req.body;
    console.log('Received password assignment request for member:', memberId);
    const hashedPassword = await bcrypt.hash(password, 10);
    await authRepository.updateMemberWithCardAndPassword(memberId, hashedPassword, '');

    res.json({ message: tOrDefault('auth.success.AUTH_PASSWORD_ASSIGNED_OK', locale, 'Password assigned successfully') });
  } catch (error) {
    console.error('Password assignment error:', error);
    res.status(500).json({ code: 'AUTH_PASSWORD_ASSIGN_FAILED', message: tOrDefault('auth.errorsByCode.AUTH_PASSWORD_ASSIGN_FAILED', locale, 'Failed to assign password') });
  }
}

export async function debugMemberHandler(req: Request, res: Response): Promise<void | Response> {
  const locale = req.locale;
  try {
    const memberId = parseInt(req.params.id);
    console.log(`Debug request for member ${memberId}`);

    const member = await prisma.member.findUnique({
      where: {
        member_id: memberId
      },
      select: {
        member_id: true,
        first_name: true,
        last_name: true,
        full_name: true,
        email: true,
        status: true,
        registration_completed: true,
        password_hash: true
      }
    });

    if (!member) {
      console.log(`No member found with ID: ${memberId}`);
      res.status(404).json({ code: 'MEMBER_NOT_FOUND', message: tOrDefault('errorsByCode.MEMBER_NOT_FOUND', locale, 'Member not found') });
      return;
    }

    // Transform to match original response format
    const { password_hash, ...memberData } = member;
    const responseData = {
      ...memberData,
      has_password: password_hash !== null
    };

    return res.json({
      member: responseData,
      debug_note: 'This endpoint is for development only',
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return res.status(500).json({ code: 'SERVER_ERROR', error: tOrDefault('errorsByCode.SERVER_ERROR', locale, String(error)) });
  }
}
