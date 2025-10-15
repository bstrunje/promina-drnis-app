import { Request, Response } from 'express';
import prisma from '../../utils/prisma.js';
import { authenticator } from 'otplib';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, REFRESH_TOKEN_SECRET } from '../../config/jwt.config.js';
import { getTokenExpiryDate } from '../../utils/dateUtils.js';
// TODO (2FA): Integrate real SMS provider and wire sending here.
import { sendTwoFactorCodeEmail } from '../../services/email.service.js';

const isDev = process.env.NODE_ENV === 'development';

// Pomoćne funkcije za enkripciju TOTP secreta (AES-256-GCM)
function getEncKey(): Buffer {
  const key = process.env.TWOFA_ENC_KEY;
  if (!key) {
    throw new Error('TWOFA_ENC_KEY nije postavljen');
  }
  // Očekujemo 32 bajta u base64 ili hex formatu
  if (/^[A-Fa-f0-9]+$/.test(key) && key.length === 64) return Buffer.from(key, 'hex');
  try { return Buffer.from(key, 'base64'); } catch { /* no-op */ }
  // Fallback: derivacija iz JWT_SECRET (manje sigurno, ali omogućava razvoj)
  return crypto.createHash('sha256').update(JWT_SECRET).digest();
}

function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const key = getEncKey();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

function decryptSecret(encB64: string): string {
  const buf = Buffer.from(encB64, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const key = getEncKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString('utf8');
}

// Generira JWT za pending 2FA izazov (kratkog vijeka)
function createTwoFaChallengeToken(payload: object, expiresInSeconds: number): string {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: expiresInSeconds });
}

// Izdavanje access/refresh tokena (zajedničko s loginom, minimalna duplikacija)
async function issueTokens(res: Response, memberId: number, role: string, req: Request) {
  const accessToken = jwt.sign(
    { id: memberId, role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  const userAgent = req.headers['user-agent'] || 'unknown';
  const clientIp = req.ip || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  const deviceFingerprint = Buffer.from(`${userAgent}:${clientIp}`).toString('base64').substring(0, 32);

  const refreshToken = jwt.sign(
    { id: memberId, role, fingerprint: deviceFingerprint, iat: Math.floor(Date.now() / 1000) },
    REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  );

  const expiresAt = getTokenExpiryDate(7);
  await prisma.refresh_tokens.deleteMany({ where: { member_id: memberId } });
  await prisma.refresh_tokens.create({ data: { token: refreshToken, member_id: memberId, expires_at: expiresAt } });

  // Postavi refresh cookie u skladu s generateCookieOptions (koristimo istu politiku kao login)
  // Napomena: generateCookieOptions je u auth.utils.ts, ali ne importamo ovdje da izbjegnemo cikličke ovisnosti.
  const secure = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https';
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });

  return accessToken;
}

// INIT OTP (Email/SMS): generira jednokratni kod i postavlja challenge cookie s hashom
export async function twoFaInitOtp(req: Request, res: Response) {
  try {
    const { channel } = req.body as { channel?: 'email' | 'sms' };
    if (!channel || (channel !== 'email' && channel !== 'sms')) {
      return res.status(400).json({ code: 'TWOFA_CHANNEL_REQUIRED', error: 'Channel must be email or sms' });
    }

    // Korisnik identitet očekujemo iz postojećeg twoFaChallenge (login step1) ili iz auth (ako je već logiran)
    let memberId: number | null = null;
    if (req.user?.id) memberId = Number(req.user.id);
    const existingToken = req.cookies?.twoFaChallenge as string | undefined;
    if (!memberId && existingToken) {
      try {
        const payload: string | jwt.JwtPayload = jwt.verify(existingToken, REFRESH_TOKEN_SECRET);
        if (typeof payload !== 'string' && payload) {
          const idVal = (payload as jwt.JwtPayload).id as unknown;
          if (typeof idVal === 'string' || typeof idVal === 'number') {
            memberId = Number(idVal);
          }
        }
      } catch {
        // ignore
      }
    }
    if (!memberId) return res.status(401).json({ code: 'TWOFA_NO_CONTEXT', error: 'No 2FA context' });

    const member = await prisma.member.findUnique({ where: { member_id: memberId } });
    if (!member) return res.status(404).json({ code: 'MEMBER_NOT_FOUND', error: 'Member not found' });

    // Dohvati postavke (TTL)
    const settings = await prisma.systemSettings.findFirst({ where: { organization_id: member.organization_id } });
    const expirySec = (settings?.twoFactorOtpExpirySeconds ?? 300);

    // Generiraj 6-znamenkasti kod
    const code = (Math.floor(100000 + Math.random() * 900000)).toString();
    const salt = crypto.createHash('sha256').update(`${channel}-otp:${member.member_id}`).digest('hex');
    const otpHash = crypto.createHash('sha256').update(`${salt}:${code}`).digest('hex');

    // Napravi novi challenge token s otpHash (ne čuvamo kod u bazi)
    const challenge = createTwoFaChallengeToken({ id: member.member_id, otpHash, ch: channel }, expirySec);

    // Postavi cookie (isti pristup kao generateCookieOptions — minimalna duplikacija)
    const secure = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https';
    res.cookie('twoFaChallenge', challenge, {
      httpOnly: true,
      secure,
      sameSite: secure ? 'none' : 'lax',
      maxAge: expirySec * 1000,
      path: '/',
    });

    if (channel === 'email') {
      if (!member.email) return res.status(400).json({ code: 'TWOFA_NO_EMAIL', error: 'Member email not available' });
      await sendTwoFactorCodeEmail(member.email, code, expirySec);
      if (isDev) console.log('[2FA][EMAIL] Code sent', { to: member.email, code });
      return res.json({ message: 'OTP sent via email' });
    }

    // SMS kanal
    const smsProvider = process.env.SMS_PROVIDER;
    if (!smsProvider) {
      return res.status(503).json({ code: 'SMS_PROVIDER_NOT_CONFIGURED', error: 'SMS provider is not configured' });
    }
    // Minimalni stub: samo log dok se ne doda konkretni provider
    if (isDev) console.log('[2FA][SMS] Provider:', smsProvider, 'Code:', code, 'Member:', member.member_id);
    return res.json({ message: 'OTP sent via sms (stub)' });
  } catch (err) {
    console.error('[2FA][INIT-OTP] error:', err);
    return res.status(500).json({ code: 'TWOFA_INIT_OTP_ERROR', error: 'Failed to initialize OTP' });
  }
}

// INIT SETUP: generira TOTP secret i vraća otpauth URL (QR generira frontend)
export async function twoFaInitSetup(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ code: 'AUTH_UNAUTHORIZED', error: 'Unauthorized' });
    const memberId = req.user.id;

    const member = await prisma.member.findUnique({ where: { member_id: memberId } });
    if (!member) return res.status(404).json({ code: 'MEMBER_NOT_FOUND', error: 'Member not found' });

    const secret = authenticator.generateSecret();
    const encSecret = encryptSecret(secret);

    await prisma.member.update({
      where: { member_id: member.member_id },
      data: {
        two_factor_secret: encSecret,
        two_factor_enabled: false,
        two_factor_confirmed_at: null,
        two_factor_preferred_channel: 'totp',
      }
    });

    const label = member.email || member.full_name || `member-${member.member_id}`;
    const issuer = 'Promina-Drnis';
    const otpauth = authenticator.keyuri(label, issuer, secret);

    return res.json({ otpauth, secret });
  } catch (err) {
    console.error('[2FA][INIT] error:', err);
    return res.status(500).json({ code: 'TWOFA_INIT_ERROR', error: 'Failed to initialize 2FA' });
  }
}

// CONFIRM SETUP: validira TOTP i generira recovery kodove
export async function twoFaConfirmSetup(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ code: 'AUTH_UNAUTHORIZED', error: 'Unauthorized' });
    const memberId = req.user.id;
    const { code } = req.body as { code?: string };
    if (!code) return res.status(400).json({ code: 'TWOFA_CODE_REQUIRED', error: 'Code is required' });

    const member = await prisma.member.findUnique({ where: { member_id: memberId } });
    if (!member || !member.two_factor_secret) return res.status(400).json({ code: 'TWOFA_NOT_INITIALIZED', error: '2FA not initialized' });

    const secret = decryptSecret(member.two_factor_secret);
    const valid = authenticator.verify({ token: code, secret });
    if (!valid) return res.status(400).json({ code: 'TWOFA_INVALID_CODE', error: 'Invalid code' });

    // Generiraj recovery kodove (10 kodova, 10 znakova)
    const codes: string[] = Array.from({ length: 10 }, () => crypto.randomBytes(6).toString('base64url').substring(0, 10));
    // Hashiraj (sha256 + per-user salt)
    const salt = crypto.createHash('sha256').update(`salt:${member.member_id}`).digest('hex');
    const hashed = codes.map(c => crypto.createHash('sha256').update(`${salt}:${c}`).digest('hex'));

    await prisma.member.update({
      where: { member_id: member.member_id },
      data: {
        two_factor_enabled: true,
        two_factor_confirmed_at: new Date(),
        two_factor_recovery_codes_hash: hashed,
      }
    });

    return res.json({ recoveryCodes: codes });
  } catch (err) {
    console.error('[2FA][CONFIRM] error:', err);
    return res.status(500).json({ code: 'TWOFA_CONFIRM_ERROR', error: 'Failed to confirm 2FA' });
  }
}

// VERIFY: drugi korak prijave (TOTP ili Email/SMS OTP)
export async function twoFaVerify(req: Request, res: Response) {
  try {
    const { code, channel, rememberDevice } = req.body as { code?: string; channel?: 'totp' | 'email' | 'sms'; rememberDevice?: boolean };
    if (!code) return res.status(400).json({ code: 'TWOFA_CODE_REQUIRED', error: 'Code is required' });

    // Očekujemo pending challenge cookie
    const token = req.cookies?.twoFaChallenge as string | undefined;
    if (!token) return res.status(401).json({ code: 'TWOFA_NO_CHALLENGE', error: 'No pending 2FA challenge' });

    let payload: string | jwt.JwtPayload;
    try {
      payload = jwt.verify(token, REFRESH_TOKEN_SECRET);
    } catch {
      return res.status(401).json({ code: 'TWOFA_CHALLENGE_EXPIRED', error: 'Challenge expired' });
    }

    let memberId: number | null = null;
    if (typeof payload === 'object' && payload) {
      const idVal = (payload as jwt.JwtPayload).id as unknown;
      if (typeof idVal === 'string' || typeof idVal === 'number') memberId = Number(idVal);
    }
    if (!memberId) return res.status(400).json({ code: 'TWOFA_BAD_CHALLENGE', error: 'Invalid challenge' });

    const member = await prisma.member.findUnique({ where: { member_id: memberId } });
    if (!member) return res.status(404).json({ code: 'MEMBER_NOT_FOUND', error: 'Member not found' });

    const preferred = (channel || member.two_factor_preferred_channel || 'totp') as 'totp' | 'email' | 'sms';

    if (preferred === 'totp') {
      if (!member.two_factor_secret) return res.status(400).json({ code: 'TWOFA_NOT_SETUP', error: '2FA not set up' });
      const secret = decryptSecret(member.two_factor_secret);
      const ok = authenticator.verify({ token: code, secret });
      if (!ok) return res.status(400).json({ code: 'TWOFA_INVALID_CODE', error: 'Invalid code' });
    } else if (preferred === 'email') {
      // Minimalna implementacija: očekujemo da je frontend prije ovoga zatražio slanje OTP-a
      // i da smo hash otp-a pohranili u token payload (otpHash)
      const otpHash = typeof payload === 'object' ? (payload as jwt.JwtPayload).otpHash as string | undefined : undefined;
      if (!otpHash) return res.status(400).json({ code: 'TWOFA_EMAIL_NOT_SENT', error: 'Email OTP not initialized' });
      const salt = crypto.createHash('sha256').update(`email-otp:${member.member_id}`).digest('hex');
      const given = crypto.createHash('sha256').update(`${salt}:${code}`).digest('hex');
      if (given !== otpHash) return res.status(400).json({ code: 'TWOFA_INVALID_CODE', error: 'Invalid code' });
    } else if (preferred === 'sms') {
      const otpHash = typeof payload === 'object' ? (payload as jwt.JwtPayload).otpHash as string | undefined : undefined;
      if (!otpHash) return res.status(400).json({ code: 'TWOFA_SMS_NOT_SENT', error: 'SMS OTP not initialized' });
      const salt = crypto.createHash('sha256').update(`sms-otp:${member.member_id}`).digest('hex');
      const given = crypto.createHash('sha256').update(`${salt}:${code}`).digest('hex');
      if (given !== otpHash) return res.status(400).json({ code: 'TWOFA_INVALID_CODE', error: 'Invalid code' });
    }

    // Uspjeh: izdaj tokene kao u loginu
    const accessToken = await issueTokens(res, member.member_id, member.role, req);

    // Očisti challenge cookie
    res.cookie('twoFaChallenge', '', { httpOnly: true, maxAge: 0, path: '/' });

    // Remember device cookie (opcionalno)
    if (rememberDevice) {
      const settings = await prisma.systemSettings.findFirst({ where: { organization_id: member.organization_id } });
      const days = Math.max(1, Number(settings?.twoFactorRememberDeviceDays ?? 30));
      const userAgent = req.headers['user-agent'] || 'unknown';
      const clientIp = (req.ip || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown').toString();
      const deviceFingerprint = Buffer.from(`${userAgent}:${clientIp}`).toString('base64').substring(0, 32);
      const rememberToken = jwt.sign({ id: member.member_id, fp: deviceFingerprint }, REFRESH_TOKEN_SECRET, { expiresIn: `${days}d` });
      const secure = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https';
      res.cookie('twoFaRemember', rememberToken, {
        httpOnly: true,
        secure,
        sameSite: secure ? 'none' : 'lax',
        maxAge: days * 24 * 60 * 60 * 1000,
        path: '/',
      });
    }

    return res.json({ message: '2FA verification successful', token: accessToken });
  } catch (err) {
    console.error('[2FA][VERIFY] error:', err);
    return res.status(500).json({ code: 'TWOFA_VERIFY_ERROR', error: 'Failed to verify 2FA code' });
  }
}

// DISABLE: gašenje 2FA uz TOTP ili recovery kod
export async function twoFaDisable(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ code: 'AUTH_UNAUTHORIZED', error: 'Unauthorized' });
    const memberId = req.user.id;
    const { code, recoveryCode } = req.body as { code?: string; recoveryCode?: string };

    const member = await prisma.member.findUnique({ where: { member_id: memberId } });
    if (!member) return res.status(404).json({ code: 'MEMBER_NOT_FOUND', error: 'Member not found' });

    let ok = false;
    if (code && member.two_factor_secret) {
      const secret = decryptSecret(member.two_factor_secret);
      ok = authenticator.verify({ token: code, secret });
    }

    if (!ok && recoveryCode && Array.isArray(member.two_factor_recovery_codes_hash)) {
      const salt = crypto.createHash('sha256').update(`salt:${member.member_id}`).digest('hex');
      const given = crypto.createHash('sha256').update(`${salt}:${recoveryCode}`).digest('hex');
      ok = member.two_factor_recovery_codes_hash.includes(given);
    }

    if (!ok) return res.status(400).json({ code: 'TWOFA_DISABLE_FAILED', error: 'Invalid code or recovery code' });

    await prisma.member.update({
      where: { member_id: member.member_id },
      data: {
        two_factor_enabled: false,
        two_factor_confirmed_at: null,
        two_factor_secret: null,
        two_factor_recovery_codes_hash: [],
        two_factor_preferred_channel: null,
      }
    });

    // Očisti remember-device cookie
    res.cookie('twoFaRemember', '', { httpOnly: true, maxAge: 0, path: '/' });

    return res.json({ message: '2FA disabled' });
  } catch (err) {
    console.error('[2FA][DISABLE] error:', err);
    return res.status(500).json({ code: 'TWOFA_DISABLE_ERROR', error: 'Failed to disable 2FA' });
  }
}
