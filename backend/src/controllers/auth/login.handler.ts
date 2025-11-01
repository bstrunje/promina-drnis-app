import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt, { JwtPayload } from "jsonwebtoken";
import prisma from "../../utils/prisma.js";
import { MemberLoginData } from '@/shared/types/member.js';
import { JWT_SECRET, REFRESH_TOKEN_SECRET } from '../../config/jwt.config.js';
import { getTokenExpiryDate, getCurrentDate } from '../../utils/dateUtils.js';
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
import { tOrDefault } from "../../utils/i18n.js";
import { PerformerType } from "@prisma/client";
import { verifyPin } from "../members/pinController.js";
import { 
  generateDeviceHash, 
  extractDeviceName, 
  isTrustedDevice, 
  addTrustedDevice 
} from "../../utils/trustedDevices.js";

const isDev = process.env.NODE_ENV === 'development';

// Funkcija za prijavu korisnika
export async function loginHandler(
  req: Request<Record<string, never>, Record<string, never>, MemberLoginData>,
  res: Response
): Promise<void | Response> {
  const locale = req.locale;
  try {
    const { email, password, pin } = req.body;
    const userIP = req.ip || req.socket.remoteAddress || 'unknown';

    if (!email || !password) {
      if (isDev) console.warn(`Login attempt without credentials from IP ${userIP}`);
      return res.status(400).json({
        code: 'AUTH_MISSING_CREDENTIALS',
        message: tOrDefault('auth.errorsByCode.AUTH_MISSING_CREDENTIALS', locale, 'Email and password are required')
      });
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
      return res.status(401).json({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: tOrDefault('auth.errorsByCode.AUTH_INVALID_CREDENTIALS', locale, 'Invalid credentials')
      });
    }

    if (isDev) console.log(`Member found: ${member.member_id}, status: ${member.status}, role: ${member.role}`);

    // Provjera statusa članstva i plaćene članarine
    const isAdmin = member.role === 'member_administrator' || member.role === 'member_superuser';
    const currentYear = getCurrentDate().getFullYear();
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
      return res.status(403).json({
        code: 'AUTH_MEMBERSHIP_INVALID',
        message: tOrDefault('auth.errorsByCode.AUTH_MEMBERSHIP_INVALID', locale, 'Login not possible. Membership for {{year}} year is not valid', { year: currentYear.toString() })
      });
    }

    // Provjeri status računa - samo superuseri mogu se prijaviti bez obzira na status
    const isSuperuser = member.role === 'member_superuser';
    
    if (!isSuperuser && member.status !== 'registered' && member.status !== 'active') {
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
      return res.status(403).json({
        code: 'AUTH_ACCOUNT_NOT_ACTIVE',
        message: tOrDefault('auth.errorsByCode.AUTH_ACCOUNT_NOT_ACTIVE', locale, 'Account not active. Please contact administrator.')
      });
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
      return res.status(403).json({
        code: 'AUTH_ACCOUNT_LOCKED',
        message: tOrDefault('auth.errorsByCode.AUTH_ACCOUNT_LOCKED_UNTIL', locale, 'Account is locked. Please try again after {time}.', { time: member.locked_until.toLocaleTimeString() })
      });
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
          return res.status(403).json({
            code: 'AUTH_ACCOUNT_LOCKED',
            message: `Invalid credentials. Account locked for ${ACCOUNT_LOCKOUT_DURATION_MINUTES} ${formatMinuteText(ACCOUNT_LOCKOUT_DURATION_MINUTES, locale)}.`
          });
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
      return res.status(401).json({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: tOrDefault('auth.errorsByCode.AUTH_INVALID_CREDENTIALS', locale, 'Invalid credentials')
      });
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
    
    // Dohvati system settings za 2FA provjere - prvo organizacijske, zatim globalne
    let settings = await prisma.systemSettings.findFirst({ where: { organization_id: member.organization_id } });
    if (!settings) {
      settings = await prisma.systemSettings.findFirst({ where: { organization_id: null } });
    }
    
    // TRUSTED DEVICE PROVJERA - ako je uređaj trusted, preskačemo 2FA
    const deviceHash = generateDeviceHash(req);
    let skipTwoFA = false;
    
    if (settings?.twoFactorTrustedDevicesEnabled) {
      skipTwoFA = await isTrustedDevice(member.organization_id!, member.member_id, deviceHash);
      if (isDev && skipTwoFA) {
        console.log(`Trusted device detected for member ${member.member_id}, skipping 2FA`);
      }
    }
    
    // PIN 2FA PROVJERA - prije ostalih 2FA metoda (ali samo ako nije trusted device)
    const pinEnabled = settings?.twoFactorChannelPinEnabled === true;
    if (!skipTwoFA && pinEnabled && member.pin_hash) {
      if (!pin) {
        // PIN je potreban, ali nije poslan
        return res.status(200).json({ 
          status: 'REQUIRES_PIN',
          message: 'PIN is required for login'
        });
      }
      
      try {
        const isPinValid = await verifyPin(member.member_id, pin);
        if (!isPinValid) {
          return res.status(401).json({
            code: 'AUTH_INVALID_PIN',
            message: tOrDefault('auth.errorsByCode.AUTH_INVALID_PIN', locale, 'Invalid PIN')
          });
        }
        // PIN je valjan, nastavi s login procesom
      } catch (error) {
        // PIN lockout ili druga greška
        return res.status(423).json({
          code: 'AUTH_PIN_LOCKED',
          message: error instanceof Error ? error.message : 'PIN verification failed'
        });
      }
    }
    
    // 2FA ENFORCEMENT LOGIC (minimalno, bez lomljenja postojećeg ponašanja)
    const twoFaGlobal = settings?.twoFactorGlobalEnabled === true;
    const twoFaMembersEnabled = settings?.twoFactorMembersEnabled === true;
    const requiredRoles: string[] = Array.isArray(settings?.twoFactorRequiredMemberRoles) ? (settings!.twoFactorRequiredMemberRoles as unknown as string[]) : [];
    const requiredPerms: string[] = Array.isArray(settings?.twoFactorRequiredMemberPermissions) ? (settings!.twoFactorRequiredMemberPermissions as unknown as string[]) : [];

    const roleRequires = requiredRoles.includes(member.role);
    const permsObj = (member.permissions ?? {}) as Record<string, boolean>;
    const permRequires = requiredPerms.some((p) => Boolean(permsObj[p]));
    const enforceForThisMember = twoFaGlobal || (twoFaMembersEnabled && (roleRequires || permRequires));

    if (enforceForThisMember && member.two_factor_enabled) {
      // Remember-device bypass: provjeri postoji li valjan cookie za ovaj uređaj
      const rememberCookie = req.cookies?.twoFaRemember as string | undefined;
      if (rememberCookie) {
        try {
          const userAgentForFp = req.headers['user-agent'] || 'unknown';
          const clientIpForFp = (req.ip || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown').toString();
          const currentFp = Buffer.from(`${userAgentForFp}:${clientIpForFp}`).toString('base64').substring(0, 32);
          const payload = jwt.verify(rememberCookie, REFRESH_TOKEN_SECRET) as JwtPayload | string;
          if (typeof payload !== 'string' && payload && Number(payload.id) === member.member_id && (payload as JwtPayload).fp === currentFp) {
            // Važeći remember-device — preskačemo 2FA drugi korak i nastavljamo niže s izdavanjem tokena
          } else {
            const expirySec = (settings?.twoFactorOtpExpirySeconds ?? 300);
            const challenge = jwt.sign({ id: member.member_id }, REFRESH_TOKEN_SECRET, { expiresIn: `${expirySec}s` });
            const cookieOptions = generateCookieOptions(req);
            res.cookie('twoFaChallenge', challenge, { ...cookieOptions, maxAge: expirySec * 1000, path: '/' });
            return res.status(200).json({ status: 'REQUIRES_2FA' });
          }
        } catch {
          const expirySec = (settings?.twoFactorOtpExpirySeconds ?? 300);
          const challenge = jwt.sign({ id: member.member_id }, REFRESH_TOKEN_SECRET, { expiresIn: `${expirySec}s` });
          const cookieOptions = generateCookieOptions(req);
          res.cookie('twoFaChallenge', challenge, { ...cookieOptions, maxAge: expirySec * 1000, path: '/' });
          return res.status(200).json({ status: 'REQUIRES_2FA' });
        }
      } else {
        // Nema remember-device — zahtijevaj 2FA
        const expirySec = (settings?.twoFactorOtpExpirySeconds ?? 300);
        const challenge = jwt.sign({ id: member.member_id }, REFRESH_TOKEN_SECRET, { expiresIn: `${expirySec}s` });
        const cookieOptions = generateCookieOptions(req);
        res.cookie('twoFaChallenge', challenge, { ...cookieOptions, maxAge: expirySec * 1000, path: '/' });
        return res.status(200).json({ status: 'REQUIRES_2FA' });
      }
    }

    const accessToken = jwt.sign(
      { id: member.member_id, role: member.role },
      JWT_SECRET,
      { expiresIn: "24h" }
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

    // Multi-device support: Ne brišemo sve tokene, samo istekle
    // Ovo omogućava korisniku da bude prijavljen na više uređaja istovremeno
    await prisma.refresh_tokens.deleteMany({
      where: { 
        member_id: member.member_id,
        expires_at: {
          lt: new Date() // Briši samo istekle tokene
        }
      }
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

    const permissions = member.permissions ? {
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

    // TRUSTED DEVICE SPREMANJE - ako je omogućeno u System Settings
    if (settings?.twoFactorTrustedDevicesEnabled && settings.twoFactorRememberDeviceDays) {
      try {
        const deviceName = extractDeviceName(req);
        await addTrustedDevice(
          member.organization_id!,
          member.member_id,
          deviceHash,
          deviceName,
          settings.twoFactorRememberDeviceDays
        );
        
        if (isDev) {
          console.log(`Added trusted device for member ${member.member_id}: ${deviceName}`);
        }
      } catch (error) {
        // Ne prekidamo login ako trusted device spremanje ne uspije
        console.error('Failed to add trusted device:', error);
      }
    }

    res.json({
      token: accessToken,
      refreshToken,
      member: {
        member_id: member.member_id,
        first_name: member.first_name,
        last_name: member.last_name,
        full_name: member.full_name,
        email: member.email,
        role: member.role,
        status: member.status,
        organization_id: member.organization_id,
        permissions,
        last_login: member.last_login
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    const userIP = req.ip || req.socket.remoteAddress || 'unknown';
    const emailAttempt = req.body?.email || 'unknown email';
    await auditService.logAction(
        'LOGIN_FAILED_SERVER_ERROR',
        null,
        `Server error during login attempt for ${emailAttempt} from IP ${userIP}.`,
        req,
        'error',
        undefined,
        PerformerType.MEMBER
    );
    res.status(500).json({
      code: 'AUTH_SERVER_ERROR',
      message: tOrDefault('auth.errorsByCode.AUTH_SERVER_ERROR', locale, 'Internal server error')
    });
  }
}
