import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../../utils/prisma.js";
import { MemberLoginData } from '@/shared/types/member.js';
import { JWT_SECRET, REFRESH_TOKEN_SECRET } from '../../config/jwt.config.js';
import { parseDate, cleanISODateString, getCurrentDate, formatDate, formatUTCDate, getTokenExpiryDate } from '../../utils/dateUtils.js';
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
import authRepository from "../../repositories/auth.repository.js";
import auditService from "../../services/audit.service.js";

// Funkcija za prijavu korisnika
export async function loginHandler(
  req: Request<{}, {}, MemberLoginData>,
  res: Response
): Promise<void | Response> {
  try {
    const { email, password } = req.body;
    const userIP = req.ip || req.socket.remoteAddress || 'unknown';

    if (!email || !password) {
      console.warn(`Login attempt without credentials from IP ${userIP}`);
      return res.status(400).json({ message: "Email and password are required" });
    }

    console.log(`Login attempt for email: ${email} from IP: ${userIP}`);

    const member = await prisma.member.findFirst({
      where: { email },
      include: { permissions: true },
    });

    if (!member) {
      console.log(`Member not found for email: ${email}`);
      await new Promise(resolve => setTimeout(resolve, LOGIN_DELAY_MS));
      return res.status(401).json({ message: "Invalid credentials" });
    }

    console.log(`Member found: ${member.member_id}, status: ${member.status}, role: ${member.role}`);

    if (member.status !== 'registered' && member.status !== 'active') {
      console.log(`Login attempt for inactive member: ${member.member_id}, status: ${member.status}`);
      await auditService.logAction(
        'LOGIN_LOCKOUT',
        member ? member.member_id : null,
        `Korisnik ${email} zaključan zbog previše neuspjelih pokušaja prijave.`,
        req,
        'failure',
        member ? member.member_id : undefined,
      );
      return res.status(403).json({ message: "Account not active. Please contact administrator." });
    }

    if (member.locked_until && member.locked_until > new Date()) {
      const lockoutTimeLeft = Math.ceil((member.locked_until.getTime() - new Date().getTime()) / (1000 * 60));
      console.log(`Account locked for member: ${member.member_id}. Time left: ${lockoutTimeLeft} minutes.`);
      await auditService.logAction(
        'LOGIN_FAILED_LOCKED',
        member.member_id,
        `Pokušaj prijave na zaključani račun: ${member.email}. Preostalo vrijeme zaključavanja: ${lockoutTimeLeft} ${formatMinuteText(lockoutTimeLeft)}.`,
        req, // Dodan req argument
        'failed',
        member.member_id
      );
      return res.status(403).json({ message: `Račun je zaključan. Molimo pokušajte ponovno nakon ${member.locked_until.toLocaleTimeString()}.` });
    }

    const passwordMatch = await bcrypt.compare(password, member.password_hash || "");
    if (!passwordMatch) {
      console.log(`Password mismatch for member: ${member.member_id}`);

            const now = new Date();
      let currentFailedAttempts = member.failed_login_attempts || 0;
      const lastFailed = member.last_failed_login;

      // Resetiraj brojač ako je prošlo dovoljno vremena od zadnjeg neuspjelog pokušaja
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
      );

      if (currentFailedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
        if (LOCKOUT_ADMINS || (member.role !== 'member_administrator' && member.role !== 'member_superuser')) {
          const lockoutUntil = new Date(now.getTime() + ACCOUNT_LOCKOUT_DURATION_MINUTES * 60 * 1000);
          await prisma.member.update({
            where: { member_id: member.member_id },
            data: { 
              locked_until: lockoutUntil,
              // failed_login_attempts ostaje na trenutnoj vrijednosti ili se može resetirati na 0 ovisno o željenoj logici nakon zaključavanja
              // Ovdje ga ostavljamo da se resetira prilikom uspješne prijave ili isteka vremena za resetiranje
            },
          });
          console.log(`Account locked for member: ${member.member_id} until ${lockoutUntil}`);
          auditService.logAction(
            'ACCOUNT_LOCKED',
            member.member_id,
            `Račun zaključan za: ${member.email} na ${ACCOUNT_LOCKOUT_DURATION_MINUTES} ${formatMinuteText(ACCOUNT_LOCKOUT_DURATION_MINUTES)}.`, 
            req, // Dodan req
            'success', // Status bi trebao biti 'success' jer je akcija zaključavanja uspješno provedena
            member.member_id
          );
          return res.status(403).json({ message: `Invalid credentials. Account locked for ${ACCOUNT_LOCKOUT_DURATION_MINUTES} ${formatMinuteText(ACCOUNT_LOCKOUT_DURATION_MINUTES)}.` });
        } else {
          console.log(`Admin account ${member.email} reached max login attempts, but lockout is disabled for admins.`);
           auditService.logAction(
              'LOGIN_FAILED_ADMIN_MAX_ATTEMPTS',
              member.member_id,
              `Admin račun ${member.email} dosegao maksimalan broj neuspješnih prijava, ali zaključavanje nije aktivno za administratore.`,
              req, // Dodan req
              'warning',
              member.member_id
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

    auditService.logAction(
      'LOGIN_SUCCESS',
      member.member_id,
      `Uspješna prijava za ${email}.`,
      req,
      'success',
      member.member_id,
    );

    console.log(`Successful login for member: ${member.member_id}. Role: ${member.role}`);
    
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
      // Dodati ostala specifična prava iz MemberPermissions modela ako postoje i ako su potrebna na frontendu
      // npr. can_manage_users, can_manage_system_settings itd.
      // Za sada ostavljam samo ona koja su bila mapirana, uz ispravan pristup i default vrijednost
    } : {};
    // Uklonjeni dupli unosi i ispravljen pristup na member.permissions

    res.json({
      accessToken,
      user: {
        id: member.member_id,
        email: member.email,
        firstName: member.first_name,
        lastName: member.last_name,
        fullName: member.full_name,
        role: member.role,
        status: member.status,
        profileImagePath: member.profile_image_path,
        permissions: permissions, 
      },
    });

  } catch (error) {
    console.error("Login error:", error);
    const userIP = req.ip || req.socket.remoteAddress || 'unknown';
    const emailAttempt = req.body?.email || 'unknown email';
    await auditService.logAction(
        'LOGIN_FAILED_SERVER_ERROR',
        null, 
        `Serverska greška prilikom pokušaja prijave za: ${emailAttempt}. Greška: ${String(error)}`,
        req, // Dodan req argument
        'error',
        undefined // Nema specifičnog affected_member u ovom slučaju
    );
    res.status(500).json({ message: "Internal server error" });
  }
}

// Funkcija za obnavljanje access tokena pomoću refresh tokena
export async function refreshTokenHandler(req: Request, res: Response): Promise<void | Response> {
  console.log('Refresh token zahtjev primljen');
  console.log('Origin:', req.headers.origin);
  console.log('Cookies primljeni na backendu:', req.cookies);
  console.log('Cookies:', JSON.stringify(req.cookies));
  console.log('User-Agent:', req.headers['user-agent']);
  
  const refreshToken = req.cookies.refreshToken;
  
  console.log('Provjera refresh tokena iz kolačića...');
  
  if (!refreshToken) {
    console.log('Refresh token nije pronađen u kolačiću');
    return res.status(401).json({ error: 'Refresh token nije pronađen' });
  }
  
  console.log('Refresh token pronađen u kolačiću:', refreshToken.substring(0, 20) + '...');
  
  try {
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as { 
        id: number, 
        role: string, 
        fingerprint?: string 
      };
      console.log('JWT verifikacija uspješna, decoded:', { id: decoded.id, role: decoded.role });
      
      if (decoded.fingerprint) {
        const userAgent = req.headers['user-agent'] || 'unknown';
        const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
        const currentFingerprint = Buffer.from(`${userAgent}:${clientIp}`).toString('base64').substring(0, 32);
        
        console.log('Provjera fingerprinta uređaja...');
        
        if (decoded.fingerprint !== currentFingerprint) {
          console.error('Fingerprint uređaja ne odgovara pohranjenom fingerprintu');
          console.log(`Token fingerprint: ${decoded.fingerprint.substring(0, 10)}...`);
          console.log(`Trenutni fingerprint: ${currentFingerprint.substring(0, 10)}...`);
          
          if (process.env.NODE_ENV === 'production') {
            return res.status(401).json({ error: 'Neispravan uređaj za refresh token' });
          } else {
            console.warn('Razlika u fingerprintu ignorirana u razvojnom okruženju');
          }
        } else {
          console.log('Fingerprint uređaja uspješno verificiran');
        }
      }
    } catch (jwtError) {
      console.error('JWT verifikacija nije uspjela:', jwtError);
      return res.status(401).json({ error: 'Neispravan refresh token' });
    }
    
    if (!prisma.refresh_tokens) {
      console.error('RefreshToken model nije dostupan u Prisma klijentu!');
      console.log('Dostupni modeli u Prisma klijentu:', Object.keys(prisma));
      res.status(500).json({ error: 'Interna greška servera' });
      return;
    }
    
    console.log(`Tražim refresh token u bazi za korisnika ID: ${decoded.id}`);
    
    let storedToken = await prisma.refresh_tokens.findFirst({
      where: { 
        token: refreshToken,
        member_id: decoded.id
      }
    });
    
    console.log('Rezultat pretrage tokena:', storedToken ? `Token pronađen (ID: ${storedToken.id})` : 'Token nije pronađen');
    
    if (!storedToken) {
      console.error(`Refresh token nije pronađen u bazi za korisnika ID: ${decoded.id}`);
      
      const userTokens = await prisma.refresh_tokens.findMany({
        where: { member_id: decoded.id }
      });
      
      console.log(`Broj tokena u bazi za korisnika ID ${decoded.id}: ${userTokens.length}`);
      
      if (userTokens.length > 0) {
        console.log('Tokeni korisnika u bazi:', userTokens.map(t => ({ 
          id: t.id, 
          token_substr: t.token.substring(0, 20) + '...',
          expires_at: t.expires_at ? formatUTCDate(new Date(t.expires_at)) : 'nije postavljen'
        })));
        
        console.log('Token je valjan ali nije pronađen u bazi - vjerojatno prijava s drugog uređaja');
        console.log('Kreiram novi token i dodajem ga u bazu...');
        
        const userAgent = req.headers['user-agent'] || 'unknown';
        const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
        const deviceFingerprint = Buffer.from(`${userAgent}:${clientIp}`).toString('base64').substring(0, 32);
        
        const expiresAt = getTokenExpiryDate(7);
        
        try {
          const newToken = await prisma.refresh_tokens.create({
            data: {
              token: refreshToken,
              member_id: decoded.id,
              expires_at: expiresAt
            }
          });
          
          console.log(`Novi token uspješno kreiran s ID: ${newToken.id}, datum isteka: ${formatUTCDate(expiresAt)}`);
          storedToken = newToken;
        } catch (error) {
          console.error('Greška pri kreiranju novog tokena:', error);
          res.status(500).json({ error: 'Interna greška servera pri obradi tokena' });
          return;
        }
      } else {
        console.error(`Korisnik ID: ${decoded.id} nema aktivnih tokena u bazi`);
        res.status(403).json({ error: 'Refresh token nije valjan' });
        return;
      }
    }
    
    if (storedToken.expires_at) {
      const currentDate = new Date();
      const expiryDate = new Date(storedToken.expires_at);
      
      console.log(`Provjera isteka tokena: trenutno vrijeme=${formatUTCDate(currentDate)}, vrijeme isteka=${formatUTCDate(expiryDate)}`);
      
      if (currentDate > expiryDate) {
        console.error(`Refresh token je istekao u bazi podataka: ${formatUTCDate(expiryDate)}`);
        
        await prisma.refresh_tokens.delete({
          where: { id: storedToken.id }
        });
        
        res.status(401).json({ error: 'Refresh token je istekao' });
        return;
      }
    }
    
    const member = await prisma.member.findUnique({ 
      where: { member_id: decoded.id } 
    });
    
    if (!member) {
      console.error(`Korisnik s ID ${decoded.id} nije pronađen u bazi`);
      res.status(403).json({ error: 'Korisnik nije pronađen' });
      return;
    }
    
    console.log(`Korisnik pronađen: ID=${member.member_id}, uloga=${member.role}`);
    
    const accessToken = jwt.sign(
      { id: member.member_id, role: member.role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
    
    const userAgent = req.headers['user-agent'] || 'unknown';
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const deviceFingerprint = Buffer.from(`${userAgent}:${clientIp}`).toString('base64').substring(0, 32);
    
    console.log('Generiran fingerprint uređaja za token');
    
    const newRefreshToken = jwt.sign(
      { 
        id: member.member_id, 
        role: member.role,
        fingerprint: deviceFingerprint,
        iat: Math.floor(Date.now() / 1000)
      }, 
      REFRESH_TOKEN_SECRET, 
      { expiresIn: '7d' }
    );
    
    console.log(`Ažuriram refresh token u bazi (ID: ${storedToken.id})`);
    
    try {
      const expiresAt = getTokenExpiryDate(7);
      
      const updatedToken = await prisma.refresh_tokens.update({
        where: { id: storedToken.id },
        data: {
          token: newRefreshToken,
          expires_at: expiresAt
        }
      });
      
      console.log(`Token uspješno ažuriran, novi datum isteka: ${formatUTCDate(expiresAt)}`);
      
      const verifyToken = await prisma.refresh_tokens.findFirst({
        where: { token: newRefreshToken }
      });
      
      if (verifyToken) {
        console.log(`Potvrda: novi token je uspješno ažuriran u bazi s ID: ${verifyToken.id}`);
      } else {
        console.error('Upozorenje: novi token nije pronađen u bazi nakon ažuriranja!');
      }
    } catch (error) {
      console.error('Greška pri ažuriranju refresh tokena:', error);
      throw error; 
    }
    
    const isProduction = process.env.NODE_ENV === 'production';
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const origin = req.headers.origin || '';
    
    const isCrossOrigin = origin && origin !== `${protocol}://${req.headers.host}`;
    console.log(`Zahtjev je ${isCrossOrigin ? 'cross-origin' : 'same-origin'}, origin: ${origin}, host: ${req.headers.host}`);
    
    if (req.cookies.systemManagerRefreshToken) {
      console.log('Brišem systemManagerRefreshToken kolačić za izbjegavanje konflikta');
      const systemManagerCookieOptions = generateCookieOptions(req);
      res.clearCookie('systemManagerRefreshToken', systemManagerCookieOptions);
    }
    
    if (req.cookies.refreshToken) {
      console.log('Brišem stari refreshToken kolačić prije postavljanja novog');
      const memberCookieOptions = generateCookieOptions(req);
      res.clearCookie('refreshToken', memberCookieOptions);
    }
    
    const cookieOptions = generateCookieOptions(req);
    
    res.cookie('refreshToken', newRefreshToken, cookieOptions);
    
    console.log('Postavljen novi refresh token kolačić s opcijama:', cookieOptions);
    
    if (isProduction) {
      console.log('Produkcijsko okruženje: vraćam samo accessToken');
      res.json({ accessToken });
    } else {
      console.log('Razvojno okruženje: vraćam novi refresh token u odgovoru');
      res.json({ 
        accessToken,
        refreshToken: newRefreshToken 
      });
    }
  } catch (error) {
    console.error('Greška pri obnavljanju tokena:', error);
    res.status(403).json({ error: 'Refresh token nije valjan ili je došlo do interne greške servera pri obnavljanju tokena.' });
  }
}

// Funkcija za odjavu korisnika i poništavanje refresh tokena
export async function logoutHandler(req: Request, res: Response): Promise<void | Response> {
  const { refreshToken, systemManagerRefreshToken } = req.cookies;

  const baseCookieOptions = generateCookieOptions(req);
  const cookieOptionsToClear = {
    ...baseCookieOptions,
    maxAge: 0, 
  };
  delete baseCookieOptions.maxAge; 

  console.log('Opcije za BRISANJE kolačića:', cookieOptionsToClear);

  try {
    if (refreshToken) {
      console.log('Pronađen refreshToken, brišem ga iz baze i šaljem clearCookie.');
      await prisma.refresh_tokens.deleteMany({
        where: { token: refreshToken },
      });
      res.clearCookie('refreshToken', cookieOptionsToClear);
    }

    if (systemManagerRefreshToken) {
      console.log('Pronađen systemManagerRefreshToken, brišem ga iz baze i šaljem clearCookie.');
      await prisma.refresh_tokens.deleteMany({
        where: { token: systemManagerRefreshToken },
      });
      res.clearCookie('systemManagerRefreshToken', cookieOptionsToClear);
    }

    if (!refreshToken && !systemManagerRefreshToken) {
        console.log('Nije pronađen nijedan token za odjavu, ali se odjava smatra uspješnom.');
    }

    res.status(200).json({ message: 'Odjava uspješna' });

  } catch (error) {
    console.error('Greška prilikom odjave:', error);
    if (refreshToken) res.clearCookie('refreshToken', cookieOptionsToClear);
    if (systemManagerRefreshToken) res.clearCookie('systemManagerRefreshToken', cookieOptionsToClear);
    
    res.status(500).json({ error: 'Greška prilikom odjave' });
  }
}