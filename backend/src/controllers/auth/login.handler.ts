import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../../utils/prisma.js";
import { MemberLoginData } from '@/shared/types/member.js';
import { JWT_SECRET, REFRESH_TOKEN_SECRET } from '../../config/jwt.config.js';
import { getTokenExpiryDate } from '../../utils/dateUtils.js';
import {
  MAX_FAILED_LOGIN_ATTEMPTS,
  ACCOUNT_LOCKOUT_DURATION_MINUTES,
  FAILED_ATTEMPTS_RESET_MINUTES,
  LOGIN_DELAY_MS,
  LOCKOUT_ADMINS
} from '../../config/auth.config.js';
import {
  generateCookieOptions,
  formatMinuteText,
} from './auth.utils.js';
import auditService from "../../services/audit.service.js";
import { PerformerType } from "@prisma/client";

const isDev = process.env.NODE_ENV === 'development';

// Funkcija za prijavu korisnika
export async function loginHandler(
  req: Request<Record<string, never>, Record<string, never>, MemberLoginData>,
  res: Response
): Promise<void | Response> {
  try {
    const { email, password } = req.body;
    const userIP = req.ip || req.socket.remoteAddress || 'unknown';

    if (!email || !password) {
      if (isDev) console.warn(`Login attempt without credentials from IP ${userIP}`);
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (isDev) console.log(`Login attempt for email: ${email} from IP: ${userIP}`);

    const member = await prisma.member.findFirst({
      where: { email },
      include: {
        permissions: true,
        periods: {
          orderBy: {
            start_date: 'desc'
          },
          take: 1
        }
      },
    });

    if (!member) {
      if (isDev) console.log(`Member not found for email: ${email}`);
      await new Promise(resolve => setTimeout(resolve, LOGIN_DELAY_MS));
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (isDev) console.log(`Member found: ${member.member_id}, status: ${member.status}, role: ${member.role}`);

    // Provjera statusa članstva i plaćene članarine
    const isAdmin = member.role === 'member_administrator' || member.role === 'member_superuser';
    const currentYear = new Date().getFullYear();
    const lastPeriod = member.periods[0];

    let isMembershipValid = false;
    if (lastPeriod) {
      if (lastPeriod.end_date && new Date(lastPeriod.end_date) < new Date()) {
        // Članstvo je eksplicitno završilo u prošlosti
        isMembershipValid = false;
      } else {
        // Članstvo nema krajnji datum, provjeri godinu početka
        const membershipYear = new Date(lastPeriod.start_date).getFullYear();
        if (membershipYear >= currentYear) {
          isMembershipValid = true;
        }
      }
    }

    if (!isAdmin && !isMembershipValid) {
      if (isDev) console.log(`Login denied for member: ${member.member_id}. Membership for ${currentYear} is not valid.`);
      await auditService.logAction(
        'LOGIN_FAILED_MEMBERSHIP_EXPIRED',
        member.member_id,
        `Pokušaj prijave s nevažećom članarinom za ${currentYear}.`,
        req,
        'failure',
        member.member_id,
        PerformerType.MEMBER
      );
      return res.status(403).json({ message: `Prijava nije moguća. Članarina za ${currentYear} godinu nije važeća.` });
    }

    if (member.status !== 'registered' && member.status !== 'active') {
      if (isDev) console.log(`Login attempt for inactive member: ${member.member_id}, status: ${member.status}`);
      await auditService.logAction(
        'LOGIN_LOCKOUT',
        member ? member.member_id : null,
        `Korisnik ${email} zaključan zbog previše neuspjelih pokušaja prijave.`,
        req,
        'failure',
        member ? member.member_id : undefined,
        PerformerType.MEMBER
      );
      return res.status(403).json({ message: "Account not active. Please contact administrator." });
    }

    if (member.locked_until && member.locked_until > new Date()) {
      const lockoutTimeLeft = Math.ceil((member.locked_until.getTime() - new Date().getTime()) / (1000 * 60));
      if (isDev) console.log(`Account locked for member: ${member.member_id}. Time left: ${lockoutTimeLeft} minutes.`);
      await auditService.logAction(
        'LOGIN_FAILED_LOCKED',
        member.member_id,
        `Pokušaj prijave na zaključani račun: ${member.email}. Preostalo vrijeme zaključavanja: ${lockoutTimeLeft} ${formatMinuteText(lockoutTimeLeft)}.`, 
        req, 
        'failed',
        member.member_id,
        PerformerType.MEMBER
      );
      return res.status(403).json({ message: `Račun je zaključan. Molimo pokušajte ponovno nakon ${member.locked_until.toLocaleTimeString()}.` });
    }

    const passwordMatch = await bcrypt.compare(password, member.password_hash || "");
    if (!passwordMatch) {
      if (isDev) console.log(`Password mismatch for member: ${member.member_id}`);

            const now = new Date();
      let currentFailedAttempts = member.failed_login_attempts || 0;
      const lastFailed = member.last_failed_login;

      if (lastFailed && now.getTime() - new Date(lastFailed).getTime() > FAILED_ATTEMPTS_RESET_MINUTES * 60 * 1000) {
        currentFailedAttempts = 0;
      }

      currentFailedAttempts++;

      await prisma.member.update({
        where: { member_id: member.member_id },
        data: {
          failed_login_attempts: currentFailedAttempts,
          last_failed_login: now,
        },
      });

      auditService.logAction(
        'LOGIN_FAILURE',
        member.member_id,
        `Neuspjela prijava za ${email}. Pokušaj ${currentFailedAttempts}/${MAX_FAILED_LOGIN_ATTEMPTS}.`,
        req,
        'failure',
        member.member_id,
        PerformerType.MEMBER
      );

      if (currentFailedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
        if (LOCKOUT_ADMINS || (member.role !== 'member_administrator' && member.role !== 'member_superuser')) {
          const lockoutUntil = new Date(now.getTime() + ACCOUNT_LOCKOUT_DURATION_MINUTES * 60 * 1000);
          await prisma.member.update({
            where: { member_id: member.member_id },
            data: { 
              locked_until: lockoutUntil,
            },
          });
          if (isDev) console.log(`Account locked for member: ${member.member_id} until ${lockoutUntil}`);
          auditService.logAction(
            'ACCOUNT_LOCKED',
            member.member_id,
            `Račun zaključan za: ${member.email} na ${ACCOUNT_LOCKOUT_DURATION_MINUTES} ${formatMinuteText(ACCOUNT_LOCKOUT_DURATION_MINUTES)}.`, 
            req, 
            'success', 
            member.member_id,
            PerformerType.MEMBER
          );
          return res.status(403).json({ message: `Invalid credentials. Account locked for ${ACCOUNT_LOCKOUT_DURATION_MINUTES} ${formatMinuteText(ACCOUNT_LOCKOUT_DURATION_MINUTES)}.` });
        } else {
          if (isDev) console.log(`Admin account ${member.email} reached max login attempts, but lockout is disabled for admins.`);
           auditService.logAction(
              'LOGIN_FAILED_ADMIN_MAX_ATTEMPTS',
              member.member_id,
              `Admin račun ${member.email} dosegao maksimalan broj neuspješnih prijava, ali zaključavanje nije aktivno za administratore.`,
              req, 
              'warning',
              member.member_id,
              PerformerType.MEMBER
          );
        }
      }

      await new Promise(resolve => setTimeout(resolve, LOGIN_DELAY_MS));
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (member.failed_login_attempts && member.failed_login_attempts > 0) {
      await prisma.member.update({
        where: { member_id: member.member_id },
        data: { 
          failed_login_attempts: 0, 
          last_failed_login: null, 
          locked_until: null, 
        },
      });
    }

    await prisma.member.update({
      where: { member_id: member.member_id },
      data: { last_login: new Date() }
    });

    const accessToken = jwt.sign(
      { id: member.member_id, role: member.role },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    const userAgent = req.headers['user-agent'] || 'unknown';
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const deviceFingerprint = Buffer.from(`${userAgent}:${clientIp}`).toString('base64').substring(0, 32);

    const refreshToken = jwt.sign(
      { 
        id: member.member_id, 
        role: member.role,
        fingerprint: deviceFingerprint,
        iat: Math.floor(Date.now() / 1000) 
      },
      REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    const expiresAt = getTokenExpiryDate(7); 

    await prisma.refresh_tokens.deleteMany({
      where: { member_id: member.member_id }
    });
    
    await prisma.refresh_tokens.create({
      data: {
        token: refreshToken,
        member_id: member.member_id,
        expires_at: expiresAt
      }
    });

    const cookieOptions = generateCookieOptions(req);
    res.cookie("refreshToken", refreshToken, cookieOptions);

    // Zabilježi uspješnu prijavu u audit log
    auditService.logAction(
      'LOGIN_SUCCESS',
      member.member_id,
      `Uspješna prijava za ${email}.`,
      req,
      'success',
      member.member_id,
      PerformerType.MEMBER
    );

    const _permissions = member.permissions ? {
      can_view_members: member.permissions.can_view_members || false,
      can_edit_members: member.permissions.can_edit_members || false,
      can_add_members: member.permissions.can_add_members || false,
      can_manage_membership: member.permissions.can_manage_membership || false,
      can_view_activities: member.permissions.can_view_activities || false,
      can_create_activities: member.permissions.can_create_activities || false,
      can_approve_activities: member.permissions.can_approve_activities || false,
      can_view_financials: member.permissions.can_view_financials || false,
      can_manage_financials: member.permissions.can_manage_financials || false,
      can_send_group_messages: member.permissions.can_send_group_messages || false,
      can_manage_all_messages: member.permissions.can_manage_all_messages || false,
      can_view_statistics: member.permissions.can_view_statistics || false,
      can_export_data: member.permissions.can_export_data || false,
      can_manage_end_reasons: member.permissions.can_manage_end_reasons || false,
      can_manage_card_numbers: member.permissions.can_manage_card_numbers || false,
      can_assign_passwords: member.permissions.can_assign_passwords || false,
    } : {};

    res.json({
      message: "Prijava uspješna.",
      token: accessToken, 
      member: {
        id: member.member_id,
        full_name: member.full_name, 
        role: member.role,
      },
    });

  } catch (error) {
    console.error("Login error:", error);
    const _userIP = req.ip || req.socket.remoteAddress || 'unknown';
    const emailAttempt = req.body?.email || 'unknown email';
    await auditService.logAction(
        'LOGIN_FAILED_SERVER_ERROR',
        null, 
        `Serverska greška prilikom pokušaja prijave za: ${emailAttempt}. Greška: ${String(error)}`,
        req, 
        'error',
        undefined,
        PerformerType.MEMBER
    );
    res.status(500).json({ message: "Internal server error" });
  }
}
