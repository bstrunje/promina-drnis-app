import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../../utils/prisma.js";
import { MemberLoginData } from '@/shared/types/member.js';
import authRepository from '../../repositories/auth.repository.js';
import auditService from '../../services/audit.service.js';
import { JWT_SECRET, REFRESH_TOKEN_SECRET } from '../../config/jwt.config.js';
import { parseDate, cleanISODateString, getCurrentDate, formatDate, formatUTCDate, getTokenExpiryDate } from '../../utils/dateUtils.js';
import {
  MAX_FAILED_LOGIN_ATTEMPTS, 
  ACCOUNT_LOCKOUT_DURATION_MINUTES, 
  FAILED_ATTEMPTS_RESET_MINUTES,
  LOGIN_DELAY_MS,
  LOCKOUT_ADMINS
} from '../../config/auth.config.js'; // Prilagođena putanja
import {
  generateCookieOptions,
  formatMinuteText,
  getCardNumberLength,
  validatePassword
} from './auth.utils.js'; // Ispravna putanja

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

    // Pronađi korisnika po emailu (case-insensitive)
    const member = await prisma.member.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive', // Case-insensitive pretraga za email
        },
      },
      include: {
        login_attempts: true, // Uključi podatke o pokušajima prijave
      },
    });

    if (!member) {
      console.warn(`User not found for email: ${email}`);
      await new Promise(resolve => setTimeout(resolve, LOGIN_DELAY_MS)); // Kašnjenje radi sprječavanja timing napada
      return res.status(401).json({ message: "Invalid email or password" });
    }

    console.log(`User found: ${member.member_id}, status: ${member.status}`);

    // Provjera je li korisnički račun zaključan
    if (member.login_attempts && member.login_attempts.lockout_until && new Date() < new Date(member.login_attempts.lockout_until)) {
      const lockoutTimeRemaining = Math.ceil((new Date(member.login_attempts.lockout_until).getTime() - new Date().getTime()) / (1000 * 60));
      const minuteText = formatMinuteText(lockoutTimeRemaining);
      console.warn(`Account locked for user: ${member.email}. Lockout until: ${member.login_attempts.lockout_until}`);
      return res.status(403).json({
        message: `Račun je privremeno zaključan. Molimo pokušajte ponovno za ${lockoutTimeRemaining} ${minuteText}.`,
        lockout: true,
        lockoutUntil: member.login_attempts.lockout_until,
      });
    }
    
    // Resetiraj brojač neuspjelih pokušaja ako je prošlo dovoljno vremena
    if (member.login_attempts && member.login_attempts.failed_attempts > 0 && member.login_attempts.last_attempt_at) {
      const timeSinceLastAttempt = (new Date().getTime() - new Date(member.login_attempts.last_attempt_at).getTime()) / (1000 * 60);
      if (timeSinceLastAttempt > FAILED_ATTEMPTS_RESET_MINUTES) {
        console.log(`Resetting failed login attempts for user: ${member.email}`);
        await prisma.login_attempts.update({
          where: { member_id: member.member_id },
          data: { failed_attempts: 0, lockout_until: null },
        });
        // Ponovno dohvati login_attempts nakon ažuriranja
        if (member.login_attempts) member.login_attempts.failed_attempts = 0; 
      }
    }

    // Provjeri status korisnika
    if (member.status !== 'registered' && member.status !== 'active') { // 'active' je stari status, 'registered' je novi
      console.warn(`Login attempt for inactive user: ${member.email}, status: ${member.status}`);
      let message = "Vaš korisnički račun nije aktivan. Molimo kontaktirajte administratora.";
      if (member.status === 'pending') {
        message = "Vaš korisnički račun čeka odobrenje administratora.";
      } else if (member.status === 'suspended') {
        message = "Vaš korisnički račun je suspendiran.";
      } else if (member.status === 'deactivated') {
        message = "Vaš korisnički račun je deaktiviran.";
      }
      return res.status(403).json({ message });
    }

    // Provjera lozinke
    const passwordMatch = await bcrypt.compare(password, member.password_hash || "");
    if (!passwordMatch) {
      console.warn(`Invalid password for user: ${member.email}`);
      
      // Ažuriraj brojač neuspjelih pokušaja
      let currentFailedAttempts = (member.login_attempts?.failed_attempts || 0) + 1;
      let lockoutUntil: Date | null = null;

      if (currentFailedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS && (LOCKOUT_ADMINS || (member.role !== 'member_administrator' && member.role !== 'member_superuser'))) {
        lockoutUntil = new Date(Date.now() + ACCOUNT_LOCKOUT_DURATION_MINUTES * 60 * 1000);
        console.warn(`Account locked for user: ${member.email} due to too many failed attempts. Lockout until: ${lockoutUntil}`);
        
        // Slanje obavijesti o zaključavanju računa
        try {
          await auditService.logEvent({
            action_type: 'ACCOUNT_LOCKED',
            performed_by: member.member_id, // Može biti null ako korisnik nije pronađen
            action_details: `Račun korisnika ${member.email} (ID: ${member.member_id}) je zaključan zbog ${currentFailedAttempts} neuspjelih pokušaja prijave.`,
            ip_address: userIP,
            status: 'failure',
            affected_member: member.member_id
          });
        } catch (auditError) {
          console.error("Greška pri logiranju zaključavanja računa:", auditError);
        }
      }

      await prisma.login_attempts.upsert({
        where: { member_id: member.member_id },
        update: {
          failed_attempts: currentFailedAttempts,
          last_attempt_at: new Date(),
          lockout_until: lockoutUntil,
          ip_address: userIP,
        },
        create: {
          member_id: member.member_id,
          failed_attempts: currentFailedAttempts,
          last_attempt_at: new Date(),
          lockout_until: lockoutUntil,
          ip_address: userIP,
        },
      });
      
      await new Promise(resolve => setTimeout(resolve, LOGIN_DELAY_MS)); // Kašnjenje
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Uspješna prijava - resetiraj brojač neuspjelih pokušaja
    if (member.login_attempts && member.login_attempts.failed_attempts > 0) {
      await prisma.login_attempts.update({
        where: { member_id: member.member_id },
        data: { failed_attempts: 0, lockout_until: null, last_successful_login: new Date() },
      });
    } else if (!member.login_attempts) {
      await prisma.login_attempts.create({
        data: {
          member_id: member.member_id,
          failed_attempts: 0,
          last_successful_login: new Date(),
          ip_address: userIP,
        }
      });
    } else {
       await prisma.login_attempts.update({
        where: { member_id: member.member_id },
        data: { last_successful_login: new Date(), ip_address: userIP }, // Ažuriraj samo vrijeme zadnje uspješne prijave i IP
      });
    }

    // Generiraj JWT access token
    const accessToken = jwt.sign(
      { id: member.member_id, role: member.role },
      JWT_SECRET,
      { expiresIn: '15m' } // Access token traje 15 minuta
    );

    // Generiranje fingerprinta uređaja za dodatnu sigurnost
    const userAgent = req.headers['user-agent'] || 'unknown';
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const deviceFingerprint = Buffer.from(`${userAgent}:${clientIp}`).toString('base64').substring(0, 32);

    // Generiraj JWT refresh token
    const refreshToken = jwt.sign(
      { 
        id: member.member_id, 
        role: member.role,
        fingerprint: deviceFingerprint, // Dodajemo fingerprint u token
        iat: Math.floor(Date.now() / 1000) // Dodajemo vrijeme izdavanja tokena
      },
      REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' } // Refresh token traje 7 dana
    );

    // Spremi refresh token u bazu podataka
    const expiresAt = getTokenExpiryDate(7); // 7 dana od sada

    // Prvo obriši sve postojeće refresh tokene za ovog korisnika
    // Ovo osigurava da je samo jedan refresh token aktivan po korisniku
    // čime se smanjuje rizik od zlouporabe starih tokena.
    // Alternativno, može se dopustiti više tokena ako se želi podržati više sesija.
    // Za sada, držimo se jednog aktivnog tokena.
    await prisma.refresh_tokens.deleteMany({
      where: { member_id: member.member_id }
    });
    
    // Sada kreiraj novi refresh token
    await prisma.refresh_tokens.create({
      data: {
        token: refreshToken,
        member_id: member.member_id,
        expires_at: expiresAt,
        // device_info: req.headers['user-agent'], // Opcionalno: spremi info o uređaju
        // ip_address: userIP // Opcionalno: spremi IP adresu
      }
    });

    // Postavi refresh token u HTTP-only kolačić
    const cookieOptions = generateCookieOptions(req);
    res.cookie('refreshToken', refreshToken, cookieOptions);
    
    console.log(`User ${member.email} logged in successfully. Role: ${member.role}`);
    console.log('Postavljen refreshToken kolačić s opcijama:', cookieOptions);

    await auditService.logEvent({
      action_type: 'LOGIN_SUCCESS',
      performed_by: member.member_id,
      action_details: `Korisnik ${member.email} (ID: ${member.member_id}) se uspješno prijavio.`,
      ip_address: userIP,
      status: 'success',
      affected_member: member.member_id
    });
    
    // Vrati access token i osnovne informacije o korisniku
    res.status(200).json({
      accessToken,
      user: {
        id: member.member_id,
        firstName: member.first_name,
        lastName: member.last_name,
        email: member.email,
        role: member.role,
        profileImagePath: member.profile_image_path,
      },
      // U razvojnom okruženju možemo vratiti i refresh token za lakše testiranje
      ...(process.env.NODE_ENV !== 'production' && { refreshTokenForDev: refreshToken })
    });

  } catch (error) {
    const userIP = req.ip || req.socket.remoteAddress || 'unknown';
    // Pokušaj dohvatiti email iz bodyja, ako postoji
    const emailFromBody = req.body?.email || 'unknown';
    
    console.error(`Login error for email: ${emailFromBody} from IP: ${userIP}:`, error);
    
    // Logiraj neuspješnu prijavu u audit log, ako je moguće identificirati korisnika
    // Ovo je generalna greška, pa je teže precizno logirati bez korisničkog ID-a
    try {
      await auditService.logEvent({
        action_type: 'LOGIN_FAILURE',
        performed_by: null, // Korisnik nije autentificiran ili nije pronađen
        action_details: `Neuspješan pokušaj prijave za email: ${emailFromBody}. Greška: ${error instanceof Error ? error.message : String(error)}`,
        ip_address: userIP,
        status: 'failure'
      });
    } catch (auditError) {
      console.error("Greška pri logiranju neuspješne prijave:", auditError);
    }

    res.status(500).json({ message: "Internal server error during login" });
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
    
    if (!isProduction) { // Ispravljena logika: ako NIJE produkcija (tj. dev je)
      console.log('Razvojno okruženje: vraćam novi refresh token u odgovoru');
      res.json({ 
        accessToken,
        refreshToken: newRefreshToken // Vraćamo refreshToken samo u dev modu
      });
    } else {
      res.json({ accessToken });
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
