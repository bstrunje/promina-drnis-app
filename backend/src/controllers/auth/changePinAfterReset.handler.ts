import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../../utils/prisma.js';
import { generateCookieOptions } from './auth.utils.js';

const isDev = process.env.NODE_ENV === 'development';

/**
 * Public endpoint za promjenu PIN-a nakon što je admin resetirao PIN
 * Ne zahtijeva token - validira trenutni PIN kao autentifikaciju
 */
export async function changePinAfterResetHandler(req: Request, res: Response): Promise<void> {
  try {
    const { memberId, currentPin, newPin } = req.body;

    if (!memberId || !currentPin || !newPin) {
      res.status(400).json({ message: 'Member ID, current PIN and new PIN are required' });
      return;
    }

    // Validacija novog PIN-a
    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      res.status(400).json({ message: 'New PIN must be exactly 6 digits' });
      return;
    }

    // Dohvati člana
    const member = await prisma.member.findUnique({
      where: { member_id: parseInt(memberId, 10) },
      select: {
        member_id: true,
        first_name: true,
        last_name: true,
        email: true,
        role: true,
        organization_id: true,
        pin_hash: true,
        pin_reset_required: true
      }
    });

    if (!member) {
      res.status(404).json({ message: 'Member not found' });
      return;
    }

    // Provjeri je li PIN reset potreban
    if (!member.pin_reset_required) {
      res.status(400).json({ message: 'PIN reset not required for this member' });
      return;
    }

    // Validacija trenutnog PIN-a
    if (!member.pin_hash) {
      res.status(400).json({ message: 'No PIN set for this member' });
      return;
    }

    const isCurrentPinValid = await bcrypt.compare(currentPin, member.pin_hash);
    if (!isCurrentPinValid) {
      res.status(401).json({ message: 'Current PIN is incorrect' });
      return;
    }

    // Hash novi PIN
    const salt = await bcrypt.genSalt(10);
    const newPinHash = await bcrypt.hash(newPin, salt);

    // Ažuriraj PIN i resetiraj flag
    await prisma.member.update({
      where: { member_id: member.member_id },
      data: {
        pin_hash: newPinHash,
        pin_set_at: new Date(),
        pin_reset_required: false,
        pin_attempts: 0,
        pin_locked_until: null
      }
    });

    if (isDev) console.log(`[PIN-CHANGE-AFTER-RESET] Member ${member.member_id} successfully changed PIN`);

    // Generiraj token za automatski login
    const token = jwt.sign(
      { id: member.member_id, role: member.role },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    // Kreiraj refresh token
    const refreshToken = jwt.sign(
      { id: member.member_id, role: member.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // Spremi refresh token u bazu
    await prisma.refresh_tokens.create({
      data: {
        token: refreshToken,
        member_id: member.member_id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dana
      }
    });

    // Postavi refresh token u cookie
    const cookieOptions = generateCookieOptions(req);
    res.cookie('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      message: 'PIN successfully changed',
      token,
      member: {
        member_id: member.member_id,
        first_name: member.first_name,
        last_name: member.last_name,
        email: member.email,
        role: member.role,
        organization_id: member.organization_id
      }
    });
  } catch (error) {
    if (isDev) console.error('Error changing PIN after reset:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
