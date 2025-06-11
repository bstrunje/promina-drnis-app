import { Request, Response } from "express";
import { DatabaseUser } from "../middleware/authMiddleware.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "../utils/db.js";
import { Member, MemberLoginData } from '../shared/types/member.js';
import { MemberUpdateData } from '../shared/types/prisma-extensions.js';
import { PoolClient } from "pg";
import { DatabaseError } from "../utils/db.js";
import authRepository from "../repositories/auth.repository.js";
import auditService from "../services/audit.service.js";
import { JWT_SECRET, REFRESH_TOKEN_SECRET } from '../config/jwt.config.js';
import prisma from "../utils/prisma.js";
import { parseDate, cleanISODateString, getCurrentDate, formatDate, formatUTCDate, getTokenExpiryDate } from '../utils/dateUtils.js';
import {
  MAX_FAILED_LOGIN_ATTEMPTS, 
  ACCOUNT_LOCKOUT_DURATION_MINUTES, 
  FAILED_ATTEMPTS_RESET_MINUTES,
  LOGIN_DELAY_MS,
  LOCKOUT_ADMINS
} from '../config/auth.config.js';

// Funkcija za generiranje konzistentnih opcija kolačića
function generateCookieOptions(req: Request, userType: 'member' | 'systemManager') {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const origin = req.headers.origin || '';
  const host = req.headers.host || '';
  
  // Provjera je li zahtjev cross-origin
  const isCrossOrigin = origin && origin !== `${isHttps ? 'https' : 'http'}://${host}`;
  
  // Određivanje secure postavke
  let secure = !isDevelopment || isHttps;
  
  // Određivanje sameSite postavke
  let sameSite: 'strict' | 'lax' | 'none' | undefined;
  
  if (isDevelopment) {
    sameSite = 'lax'; // Za lokalni razvoj
  } else if (process.env.COOKIE_DOMAIN || isCrossOrigin) {
    sameSite = 'none'; // Za cross-origin zahtjeve
    secure = true; // Ako je sameSite 'none', secure mora biti true
  } else {
    sameSite = 'strict'; // Za produkciju i same-origin zahtjeve
  }
  
  // Određivanje putanje ovisno o tipu korisnika
  // Koristimo '/' za sve kolačiće kako bi bili dostupni na svim putanjama
  const path = '/';
  
  // Dodajemo partitioned atribut za Firefox
  // Ovo rješava upozorenje "Cookie will soon be rejected because it is foreign and does not have the Partitioned attribute"
  const cookieOptions: any = {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dana
    path,
    domain: process.env.COOKIE_DOMAIN || undefined
  };
  
  // Dodajemo partitioned atribut za Firefox ako je cross-origin ili imamo COOKIE_DOMAIN
  if (isCrossOrigin || process.env.COOKIE_DOMAIN) {
    cookieOptions.partitioned = true;
  }
  
  return cookieOptions;
}

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: DatabaseUser;
    }
  }
}

interface SetPasswordRequest {
  member_id: number;
  suffix_numbers: string;
}

/**
 * Pomoćna funkcija za formatiranje teksta za minute u hrvatskom jeziku
 * (pravilno gramatičko sklanjanje riječi "minuta")
 */
function formatMinuteText(minutes: number): string {
  if (minutes === 1) return 'minutu';
  if (minutes >= 2 && minutes <= 4) return 'minute';
  return 'minuta';
}

// Pomoćna funkcija za dohvat duljine broja kartice
async function getCardNumberLength(): Promise<number> {
  const settings = await prisma.systemSettings.findFirst({
    where: { id: 'default' }
  });
  return settings?.cardNumberLength ?? 5; // Koristi 5 kao fallback ako je null ili undefined
}

// Ažurirana funkcija za validaciju lozinke
async function validatePassword(
  password: string,
  suffixNumbers?: string
): Promise<{
  isValid: boolean;
  message?: string;
  formattedPassword?: string;
}> {
  if (password.length < 6) {
    return {
      isValid: false,
      message:
        "Password must be at least 6 characters long before the -isk- suffix",
    };
  }

  if (suffixNumbers) {
    // Dohvati duljinu broja kartice iz postavki
    const cardNumberLength = await getCardNumberLength();
    const cardNumberRegex = new RegExp(`^\\d{${cardNumberLength}}$`);
    
    if (!cardNumberRegex.test(suffixNumbers)) {
      return {
        isValid: false,
        message: `Suffix must be exactly ${cardNumberLength} digits`,
      };
    }
    return {
      isValid: true,
      formattedPassword: `${password}-isk-${suffixNumbers}`, // Add hyphen for consistency
    };
  }

  return { isValid: true };
}

// Funkcija za obnavljanje access tokena pomoću refresh tokena
async function refreshTokenHandler(req: Request, res: Response): Promise<void | Response> {
  console.log('Refresh token zahtjev primljen');
  console.log('Origin:', req.headers.origin);
  console.log('Cookies:', JSON.stringify(req.cookies));
  console.log('User-Agent:', req.headers['user-agent']);
  
  // Dohvati refresh token iz kolačića
  const refreshToken = req.cookies.refreshToken;
  
  // Detaljnije logiranje za dijagnostiku
  console.log('Provjera refresh tokena iz kolačića...');
  
  if (!refreshToken) {
    console.log('Refresh token nije pronađen u kolačiću');
    return res.status(401).json({ error: 'Refresh token nije pronađen' });
  }
  
  console.log('Refresh token pronađen u kolačiću:', refreshToken.substring(0, 20) + '...');
  
  try {
    // Provjeri valjanost refresh tokena koristeći REFRESH_TOKEN_SECRET
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as { 
        id: number, 
        role: string, 
        fingerprint?: string 
      };
      console.log('JWT verifikacija uspješna, decoded:', { id: decoded.id, role: decoded.role });
      
      // Provjera fingerprinta uređaja ako postoji u tokenu
      if (decoded.fingerprint) {
        // Generiranje trenutnog fingerprinta za usporedbu
        const userAgent = req.headers['user-agent'] || 'unknown';
        const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
        const currentFingerprint = Buffer.from(`${userAgent}:${clientIp}`).toString('base64').substring(0, 32);
        
        console.log('Provjera fingerprinta uređaja...');
        
        // Usporedba fingerprinta iz tokena s trenutnim fingerprintom
        if (decoded.fingerprint !== currentFingerprint) {
          console.error('Fingerprint uređaja ne odgovara pohranjenom fingerprintu');
          console.log(`Token fingerprint: ${decoded.fingerprint.substring(0, 10)}...`);
          console.log(`Trenutni fingerprint: ${currentFingerprint.substring(0, 10)}...`);
          
          // Ako je produkcija, strože provjeravamo fingerprint
          // U razvoju dopuštamo razlike zbog lakšeg testiranja
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
    
    // Provjeri postoji li RefreshToken model u Prisma klijentu
    if (!prisma.refresh_tokens) {
      console.error('RefreshToken model nije dostupan u Prisma klijentu!');
      console.log('Dostupni modeli u Prisma klijentu:', Object.keys(prisma));
      res.status(500).json({ error: 'Interna greška servera' });
      return;
    }
    
    console.log(`Tražim refresh token u bazi za korisnika ID: ${decoded.id}`);
    
    // Provjeri postoji li token u bazi
    let storedToken = await prisma.refresh_tokens.findFirst({
      where: { 
        token: refreshToken,
        member_id: decoded.id
      }
    });
    
    console.log('Rezultat pretrage tokena:', storedToken ? `Token pronađen (ID: ${storedToken.id})` : 'Token nije pronađen');
    
    if (!storedToken) {
      console.error(`Refresh token nije pronađen u bazi za korisnika ID: ${decoded.id}`);
      
      // Dodatna dijagnostika - provjeri postoje li tokeni za ovog korisnika
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
        
        // Ako je token u kolačiću valjan (prošao JWT verifikaciju) ali nije u bazi,
        // vjerojatno je korisnik dobio novi token pri prijavi na drugom uređaju
        // U tom slučaju, kreiramo novi token i dodajemo ga u bazu
        console.log('Token je valjan ali nije pronađen u bazi - vjerojatno prijava s drugog uređaja');
        console.log('Kreiram novi token i dodajem ga u bazu...');
        
        // Generiranje novog fingerprinta za trenutni uređaj
        const userAgent = req.headers['user-agent'] || 'unknown';
        const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
        const deviceFingerprint = Buffer.from(`${userAgent}:${clientIp}`).toString('base64').substring(0, 32);
        
        // Kreiramo novi token u bazi za ovaj uređaj
        const expiresAt = getTokenExpiryDate(7); // 7 dana
        
        try {
          // Kreiramo novi zapis u bazi za ovaj token
          const newToken = await prisma.refresh_tokens.create({
            data: {
              token: refreshToken,
              member_id: decoded.id,
              expires_at: expiresAt
            }
          });
          
          console.log(`Novi token uspješno kreiran s ID: ${newToken.id}, datum isteka: ${formatUTCDate(expiresAt)}`);
          
          // Postavljamo storedToken na novi token kako bi nastavili s obradom
          storedToken = newToken;
        } catch (error) {
          console.error('Greška pri kreiranju novog tokena:', error);
          res.status(500).json({ error: 'Interna greška servera pri obradi tokena' });
          return;
        }
      } else {
        // Ako nema tokena za ovog korisnika, vrati grešku
        console.error(`Korisnik ID: ${decoded.id} nema aktivnih tokena u bazi`);
        res.status(403).json({ error: 'Refresh token nije valjan' });
        return;
      }
    }
    
    // Provjera isteka tokena u bazi podataka
    if (storedToken.expires_at) {
      const currentDate = new Date();
      const expiryDate = new Date(storedToken.expires_at);
      
      console.log(`Provjera isteka tokena: trenutno vrijeme=${formatUTCDate(currentDate)}, vrijeme isteka=${formatUTCDate(expiryDate)}`);
      
      if (currentDate > expiryDate) {
        console.error(`Refresh token je istekao u bazi podataka: ${formatUTCDate(expiryDate)}`);
        
        // Brišemo istekli token iz baze
        await prisma.refresh_tokens.delete({
          where: { id: storedToken.id }
        });
        
        res.status(401).json({ error: 'Refresh token je istekao' });
        return;
      }
    }
    
    // Generiraj novi access token
    const member = await prisma.member.findUnique({ 
      where: { member_id: decoded.id } 
    });
    
    if (!member) {
      console.error(`Korisnik s ID ${decoded.id} nije pronađen u bazi`);
      res.status(403).json({ error: 'Korisnik nije pronađen' });
      return;
    }
    
    console.log(`Korisnik pronađen: ID=${member.member_id}, uloga=${member.role}`);
    
    // Generiranje novog access tokena
    const accessToken = jwt.sign(
      { id: member.member_id, role: member.role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
    
    // Generiranje fingerprinta uređaja za dodatnu sigurnost
    const userAgent = req.headers['user-agent'] || 'unknown';
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const deviceFingerprint = Buffer.from(`${userAgent}:${clientIp}`).toString('base64').substring(0, 32);
    
    console.log('Generiran fingerprint uređaja za token');
    
    // Implementacija token rotation - generiranje novog refresh tokena koristeći REFRESH_TOKEN_SECRET
    // Dodajemo fingerprint uređaja u payload tokena za dodatnu sigurnost
    const newRefreshToken = jwt.sign(
      { 
        id: member.member_id, 
        role: member.role,
        fingerprint: deviceFingerprint, // Dodajemo fingerprint u token
        iat: Math.floor(Date.now() / 1000) // Dodajemo vrijeme izdavanja tokena
      }, 
      REFRESH_TOKEN_SECRET, 
      { expiresIn: '7d' }
    );
    
    // Ažuriranje refresh tokena u bazi
    console.log(`Ažuriram refresh token u bazi (ID: ${storedToken.id})`);
    
    try {
      // Koristimo novu funkciju za generiranje UTC datuma isteka tokena - 7 dana
      const expiresAt = getTokenExpiryDate(7);
      
      const updatedToken = await prisma.refresh_tokens.update({
        where: { id: storedToken.id },
        data: {
          token: newRefreshToken,
          expires_at: expiresAt
        }
      });
      
      console.log(`Token uspješno ažuriran, novi datum isteka: ${formatUTCDate(expiresAt)}`);
      
      // Dodatna provjera je li token stvarno ažuriran
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
      throw error; // Propagiraj grešku kako bi se uhvatila u vanjskom try-catch bloku
    }
    
    // Postavi novi refresh token u kolačić s prilagođenim postavkama za cross-origin zahtjeve
    const isProduction = process.env.NODE_ENV === 'production';
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const origin = req.headers.origin || '';
    
    // Provjera je li zahtjev cross-origin
    const isCrossOrigin = origin && origin !== `${protocol}://${req.headers.host}`;
    console.log(`Zahtjev je ${isCrossOrigin ? 'cross-origin' : 'same-origin'}, origin: ${origin}, host: ${req.headers.host}`);
    
    // Brisanje systemManagerRefreshToken kolačića ako postoji
    // kako bi se izbjegao konflikt između dva tipa tokena
    if (req.cookies.systemManagerRefreshToken) {
      console.log('Brišem systemManagerRefreshToken kolačić za izbjegavanje konflikta');
      const systemManagerCookieOptions = generateCookieOptions(req, 'systemManager');
      res.clearCookie('systemManagerRefreshToken', systemManagerCookieOptions);
    }
    
    // Također provjeravamo i brišemo stari refreshToken ako postoji
    if (req.cookies.refreshToken) {
      console.log('Brišem stari refreshToken kolačić prije postavljanja novog');
      const memberCookieOptions = generateCookieOptions(req, 'member');
      res.clearCookie('refreshToken', memberCookieOptions);
    }
    
    // Koristimo zajedničku funkciju za generiranje opcija kolačića
    const cookieOptions = generateCookieOptions(req, 'member');
    
    res.cookie('refreshToken', newRefreshToken, cookieOptions);
    
    console.log('Postavljen novi refresh token kolačić s opcijama:', cookieOptions);
    
    // Za razvojno okruženje, vraćamo i refresh token u odgovoru kako bi se mogao spremiti u lokalno spremište
    
    if (isProduction) {
      console.log('Razvojno okruženje: vraćam novi refresh token u odgovoru');
      res.json({ 
        accessToken,
        refreshToken: newRefreshToken
      });
    } else {
      // U produkciji vraćamo samo access token
      res.json({ accessToken });
    }
  } catch (error) {
    console.error('Greška pri obnavljanju tokena:', error);
    res.status(403).json({ error: 'Refresh token nije valjan' });
  }
}

// Funkcija za odjavu korisnika i poništavanje refresh tokena
async function logoutHandler(req: Request, res: Response): Promise<void> {
  const refreshToken = req.cookies.refreshToken;
  
  console.log(`Brisanje kolačića pri odjavi`);
  
  // Ako nema refresh tokena, samo obriši kolačiće i vrati uspjeh
  if (!refreshToken) {
    // Briši oba tipa kolačića za svaki slučaj
    const memberCookieOptions = generateCookieOptions(req, 'member');
    const systemManagerCookieOptions = generateCookieOptions(req, 'systemManager');
    
    res.clearCookie('refreshToken', memberCookieOptions);
    res.clearCookie('systemManagerRefreshToken', systemManagerCookieOptions);
    res.status(200).json({ message: 'Uspješna odjava' });
    return;
  }
  
  try {
    // Provjeri postoji li token u bazi i obriši ga
    await prisma.refresh_tokens.deleteMany({
      where: { token: refreshToken }
    });
    
    // Obriši oba tipa kolačića s ispravnim postavkama
    const memberCookieOptions = generateCookieOptions(req, 'member');
    const systemManagerCookieOptions = generateCookieOptions(req, 'systemManager');
    
    res.clearCookie('refreshToken', memberCookieOptions);
    // Također obriši systemManagerRefreshToken ako postoji
    res.clearCookie('systemManagerRefreshToken', systemManagerCookieOptions);
    
    res.status(200).json({ message: 'Uspješna odjava' });
  } catch (error) {
    console.error('Greška prilikom odjave:', error);
    
    // Obriši kolačić bez obzira na grešku
    const memberCookieOptions = generateCookieOptions(req, 'member');
    res.clearCookie('refreshToken', memberCookieOptions);
    
    res.status(500).json({ error: 'Greška prilikom odjave' });
  }
}

const authController = {
  // 2. Add more detailed logging to the login function to see exact format:
  async login(
    req: Request<{}, {}, MemberLoginData>, // Koristi MemberLoginData koji sada ima email
    res: Response
  ): Promise<void> {
    try {
      // Promijenjeno: dohvaća se email umjesto full_name
      const { email, password } = req.body;
      const userIP = req.ip || req.socket.remoteAddress || 'unknown';

      // Osnovna validacija ulaznih podataka (validator ovo već radi, ali dupla provjera ne škodi)
      if (!email || !password) {
        console.warn(`Login attempt without credentials from IP ${userIP}`);
        // Promijenjeno: poruka spominje email
        res.status(400).json({ message: "Email and password are required" });
        return;
      }

      // Sanitizacija ulaznih podataka
      const sanitizedEmail = email.trim(); // Koristi se email
      
      // Promijenjeno: logira se email
      console.log(`Login attempt for user "${sanitizedEmail}" from IP ${userIP}`);

      // 1. Dohvatimo člana prema emailu (pretpostavka da postoji findUserByEmail)
      // Promijenjeno: poziva se findUserByEmail umjesto findUserByFullName
      const member = await authRepository.findUserByEmail(sanitizedEmail);
      
      // Ako član ne postoji, logiramo pokušaj i vraćamo generičku poruku
      if (!member) {
        // Promijenjeno: logira se email
        console.warn(`Failed login: user "${sanitizedEmail}" not found (IP: ${userIP})`);
        // Koristimo konstantno vrijeme odziva kako bi se spriječili timing napadi
        await new Promise(resolve => setTimeout(resolve, LOGIN_DELAY_MS + Math.random() * LOGIN_DELAY_MS));
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }
      
      // Provjeri je li korisnički račun blokiran
      if (member.locked_until && member.locked_until > getCurrentDate()) {
        // Račun je zaključan - izračunaj preostalo vrijeme u minutama
        const remainingTimeMs = member.locked_until.getTime() - getCurrentDate().getTime();
        const remainingMinutes = Math.ceil(remainingTimeMs / (60 * 1000));
        
        console.warn(`Login attempt for locked account: "${sanitizedEmail}" (IP: ${userIP}, locked for ${remainingMinutes} more minutes)`);
        
        // Zabilježi pokušaj pristupa zaključanom računu u audit log
        await auditService.logAction(
          "LOGIN_ATTEMPT_LOCKED_ACCOUNT",
          member.member_id,
          `Login attempt on locked account for user ${sanitizedEmail}`,
          req,
          "warning"
        );
        
        // Odgodi odgovor radi zaštite
        await new Promise(resolve => setTimeout(resolve, LOGIN_DELAY_MS + Math.random() * LOGIN_DELAY_MS));
        
        // Vrati informaciju o zaključanom računu s preostalim vremenom
        const minuteText = formatMinuteText(remainingMinutes);
        
        res.status(401).json({
          message: `Vaš račun je privremeno blokiran zbog više neuspjelih pokušaja prijave. Pokušajte ponovno za ${remainingMinutes} ${minuteText}.`,
          lockedUntil: member.locked_until,
          remainingMinutes
        });
        return;
      }

      // Ako član nema lozinku, ne može se prijaviti
      if (!member.password_hash) {
        // Promijenjeno: logira se email
        console.warn(`Failed login: user "${sanitizedEmail}" has no password set (IP: ${userIP})`);
        res.status(401).json({ message: "Greška prilikom prijave. Kontaktiraj administratora." });
        return;
      }

      // 2. Provjera statusa člana - dohvaćamo iz tablice jer member možda nema property status
      const statusQuery = await db.query('SELECT status, registration_completed, role FROM members WHERE member_id = $1', [member.member_id]);
      const memberStatus = statusQuery.rows[0];
      
      // Ako član nije superuser, provjeri je li potpuno registriran
      if (memberStatus.role !== 'member_superuser' && (memberStatus.status !== 'registered' || !memberStatus.registration_completed)) {
        // Promijenjeno: logira se email
        console.warn(`Failed login: user "${sanitizedEmail}" is not fully registered (IP: ${userIP})`);
        res.status(401).json({ message: "Account setup incomplete. Please contact an administrator." });
        return;
      }

      // 3. Ako član nije superuser, dodatno provjeri je li članarina plaćena
      if (memberStatus.role !== 'member_superuser') {
        const membershipQuery = await db.query(`
          SELECT fee_payment_date, fee_payment_year
          FROM membership_details
          WHERE member_id = $1
        `, [member.member_id]);

        // Provjeri postoji li zapis o članstvu
        if (membershipQuery.rowCount === 0) {
          console.warn(`Failed login: user "${sanitizedEmail}" has no membership record (IP: ${userIP})`);
          res.status(401).json({ 
            message: "Membership information not found. Please contact an administrator."
          });
          return;
        }
        
        // Dohvati detalje o članstvu
        const membershipDetails = membershipQuery.rows[0];
        const currentYear = getCurrentDate().getFullYear();
        
        // Provjeri jesu li plaćeni detalji za tekuću godinu
        if (membershipDetails.fee_payment_year < currentYear) {
          console.warn(`Failed login: user "${sanitizedEmail}" has expired membership (paid for ${membershipDetails.fee_payment_year}, current year ${currentYear}) (IP: ${userIP})`);
          res.status(401).json({ 
            message: "Članstvo ti je isteklo. Za obnovu članstva kontaktiraj administratora."
          });
          return;
        }
      }

      // 4. Usporedimo lozinku s hashom
      const passwordMatch = await bcrypt.compare(password, member.password_hash);
      
      // Ako lozinka ne odgovara, logiramo pokušaj i vraćamo generičku poruku
      if (!passwordMatch) {
        // Promijenjeno: logira se email
        console.warn(`Failed login: incorrect password for user "${sanitizedEmail}" (IP: ${userIP})`);
        
        // Ne pratimo neuspjele pokušaje za admine i superusere ako je tako konfigurirano
        let shouldTrackFailedAttempt = true;
        if (!LOCKOUT_ADMINS && (member.role === 'member_administrator' || member.role === 'member_superuser')) {
          shouldTrackFailedAttempt = false;
          console.log(`Skip tracking failed attempt for administrator/superuser: ${sanitizedEmail}`);
        }
        
        if (shouldTrackFailedAttempt) {
          // Dohvati trenutno vrijeme
          const now = getCurrentDate();
          
          // Provjeri treba li resetirati brojač neuspjelih pokušaja
          // Ako je prošlo više od FAILED_ATTEMPTS_RESET_MINUTES od zadnjeg neuspjelog pokušaja
          let failedAttempts = member.failed_login_attempts || 0; // Defaultna vrijednost 0 ako je undefined
          
          if (member.last_failed_login) {
            const minutesSinceLastFailure = (now.getTime() - member.last_failed_login.getTime()) / (60 * 1000);
            if (minutesSinceLastFailure > FAILED_ATTEMPTS_RESET_MINUTES) {
              failedAttempts = 0; // Resetiraj brojač ako je prošlo dovoljno vremena
              console.log(`Resetting failed login counter for ${sanitizedEmail} after ${minutesSinceLastFailure.toFixed(2)} minutes of inactivity`);
            }
          }
          
          // Povećaj brojač neuspjelih pokušaja
          failedAttempts += 1;
          
          // Odredi treba li zaključati račun
          let lockedUntil = null;
          if (failedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
            // Izračunaj vrijeme isteka zaključavanja
            lockedUntil = new Date(now.getTime() + ACCOUNT_LOCKOUT_DURATION_MINUTES * 60 * 1000);
            console.warn(`Account locked: ${sanitizedEmail} (IP: ${userIP}, ${failedAttempts} failed attempts, locked until ${lockedUntil})`);
            
            // Zabilježi zaključavanje računa u audit log
            await auditService.logAction(
              "ACCOUNT_LOCKED",
              member.member_id,
              `Account locked after ${failedAttempts} failed login attempts`,
              req,
              "warning"
            );
          }
          
          // Ažuriraj podatke o neuspjelim prijavama u bazi
          const updateData: MemberUpdateData = {
            failed_login_attempts: failedAttempts,
            last_failed_login: now,
            locked_until: lockedUntil
          };
          
          await prisma.member.update({
            where: { member_id: member.member_id },
            data: updateData
          });
          
          // Zabilježi neuspjelu prijavu u audit log
          await auditService.logAction(
            "LOGIN_FAILED",
            member.member_id,
            `Failed login attempt (${failedAttempts}/${MAX_FAILED_LOGIN_ATTEMPTS})`,
            req,
            "warning"
          );
          
          // Ako je račun zaključan, vrati specifičnu poruku
          if (lockedUntil) {
            // Koristimo funkciju za formatiranje teksta za minute - izbor pravilnog teksta za hrvatski jezik
            const minutes = ACCOUNT_LOCKOUT_DURATION_MINUTES;
            const minuteText = formatMinuteText(minutes);
            
            res.status(401).json({
              message: `Vaš račun je privremeno blokiran zbog više neuspjelih pokušaja prijave. Pokušajte ponovno za ${minutes} ${minuteText}.`,
              lockedUntil: lockedUntil,
              remainingMinutes: ACCOUNT_LOCKOUT_DURATION_MINUTES
            });
            return;
          }
        } else {
          // Za administratore i superusere (ako je tako konfigurirano) ne pratimo neuspjele pokušaje
          console.log(`Not tracking failed login attempt for admin/superuser: ${sanitizedEmail}`);
        }
        
        // Odgodi odgovor radi dosljednog ponašanja
        await new Promise(resolve => setTimeout(resolve, LOGIN_DELAY_MS + Math.random() * LOGIN_DELAY_MS));
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }

      // 5. Uspješna prijava - generirajmo JWT token (access token)
      const token = jwt.sign(
        { id: member.member_id, role: member.role },
        JWT_SECRET,
        { expiresIn: "15m" } // Smanjeno na 15 minuta za bolju sigurnost
      );

      // Generiranje fingerprinta uređaja za dodatnu sigurnost
      const userAgent = req.headers['user-agent'] || 'unknown';
      const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      
      // Jednostavan hash za fingerprint - kombinacija user-agent i IP adrese
      const deviceFingerprint = Buffer.from(`${userAgent}:${clientIp}`).toString('base64').substring(0, 32);
      
      console.log('Generiran fingerprint uređaja za token');
      
      // Generiraj refresh token s fingerprintom
      const refreshToken = jwt.sign(
        { 
          id: member.member_id, 
          role: member.role,
          fingerprint: deviceFingerprint // Dodajemo fingerprint u token
        },
        REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" } // Refresh token traje 7 dana
      );

      // Spremi refresh token u bazu
      try {
        console.log(`Pokušavam spremiti refresh token za korisnika ID: ${member.member_id}`);
        
        // Provjeri postoji li RefreshToken model u Prisma klijentu
        if (!prisma.refresh_tokens) {
          console.error('RefreshToken model nije dostupan u Prisma klijentu!');
          console.log('Dostupni modeli u Prisma klijentu:', Object.keys(prisma));
          throw new Error('RefreshToken model nije dostupan');
        }
        
        // Prvo provjeri postoji li već refresh token za ovog korisnika
        console.log('Tražim postojeći refresh token u bazi...');
        const existingToken = await prisma.refresh_tokens.findFirst({
          where: { member_id: member.member_id }
        });

        // Koristimo novu funkciju za generiranje UTC datuma isteka tokena - 7 dana
        const expiresAt = getTokenExpiryDate(7);
        
        if (existingToken) {
          console.log(`Pronađen postojeći token (ID: ${existingToken.id}), ažuriram ga...`);
          // Ažuriraj postojeći token
          const updatedToken = await prisma.refresh_tokens.update({
            where: { id: existingToken.id },
            data: {
              token: refreshToken,
              expires_at: expiresAt
            }
          });
          console.log(`Token uspješno ažuriran, novi datum isteka: ${formatUTCDate(expiresAt)}`);
        } else {
          console.log('Nije pronađen postojeći token, kreiram novi...');
          // Kreiraj novi token
          const newToken = await prisma.refresh_tokens.create({
            data: {
              token: refreshToken,
              member_id: member.member_id,
              expires_at: expiresAt
            }
          });
          console.log(`Novi token uspješno kreiran s ID: ${newToken.id}, datum isteka: ${formatUTCDate(expiresAt)}`);
        }
        
        // Dodatna provjera je li token stvarno spremljen
        const verifyToken = await prisma.refresh_tokens.findFirst({
          where: { token: refreshToken }
        });
        
        if (verifyToken) {
          console.log(`Potvrda: token je uspješno spremljen u bazu s ID: ${verifyToken.id}`);
        } else {
          console.error('Upozorenje: token nije pronađen u bazi nakon spremanja!');
        }

        // Postavi refresh token kao HTTP-only kolačić s prilagođenim postavkama za cross-origin zahtjeve
        const cookieOptions = generateCookieOptions(req, 'member');
        
        console.log('Postavljam refresh token kolačić s opcijama:', cookieOptions);
        res.cookie('refreshToken', refreshToken, cookieOptions);

        // Provjeri je li kolačić postavljen u odgovoru
        console.log('Response headers:', res.getHeaders());
        console.log(`Refresh token uspješno generiran i pohranjen za korisnika ID: ${member.member_id}`);
      } catch (error) {
        console.error('Greška pri spremanju refresh tokena:', error);
        // Nastavljamo s prijavom čak i ako spremanje refresh tokena ne uspije
      }

      // Ažuriramo podatak o zadnjoj prijavi u bazi i resetiramo neuspjele pokušaje prijave
      const updateData: MemberUpdateData = {
        last_login: getCurrentDate(),
        failed_login_attempts: 0,   // Resetiraj neuspjele pokušaje pri uspješnoj prijavi
        locked_until: null         // Ukloni eventualno zaključavanje
      };
      
      await prisma.member.update({
        where: { member_id: member.member_id },
        data: updateData
      });

      // 6. Logiramo uspješnu prijavu
      // Promijenjeno: logira se email
      console.log(`Successful login: user "${sanitizedEmail}" (ID: ${member.member_id}, Role: ${member.role}) from IP ${userIP}`);

      // 7. Bilježimo prijavu u audit log
      await auditService.logAction(
        "LOGIN_SUCCESS",
        member.member_id,
        // Promijenjeno: logira se email
        `User ${sanitizedEmail} logged in`,
        req,
        "success"
      );

      // 8. Vratimo JWT token i osnovne podatke o korisniku
      // Vraćamo full_name koji postoji na member objektu dohvaćenom iz baze
      
      // Za razvojno okruženje, vraćamo i refresh token kako bi se mogao spremiti u lokalno spremište
      const isDevelopment = process.env.NODE_ENV !== 'production';
      
      const responseData = {
        member: {
          id: member.member_id,
          full_name: `${member.first_name} ${member.last_name}${member.nickname ? ` - ${member.nickname}` : ''}`,
          role: member.role,
        },
        token,
      };
      
      // Ako smo u razvojnom okruženju, dodaj refresh token u odgovor
      if (isDevelopment) {
        console.log('Razvojno okruženje: vraćam refresh token u odgovoru');
        // Dodajemo refresh token u odgovor samo za razvojno okruženje
        Object.assign(responseData, { refreshToken });
      }
      
      res.json(responseData);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Login failed",
      });
    }
  },

  // Other methods remain unchanged...
  async registerInitial(
    req: Request<
      {},
      {},
      Omit<
        Member,
        | "member_id"
        | "status"
        | "role"
        | "total_hours"
        | "password_hash"
        | "last_login"
      >
    >,
    res: Response
  ): Promise<void> {
    try {
      const { first_name, last_name, email } = req.body;

      const memberExists = await db.query<Member>(
        "SELECT * FROM members WHERE email = $1",
        [email],
        { singleRow: true }
      );

      if (memberExists?.rowCount && memberExists.rowCount > 0) {
        res
          .status(400)
          .json({ message: "Member with this email already exists" });
        return;
      }

      await db.transaction(async (client: PoolClient) => {
        const result = await client.query<Member>(
          `INSERT INTO members (
                        first_name, last_name, email, status, role
                    ) VALUES ($1, $2, $3, 'pending', 'member')
                    RETURNING member_id, first_name, last_name, email, role`,
          [first_name, last_name, email]
        );

        const member = result.rows[0];
        res.status(201).json({
          message:
            "Member pre-registered successfully. Awaiting administrator password configuration.",
          member_id: member.member_id,
          full_name: `${member.first_name} ${member.last_name}${member.nickname ? ` - ${member.nickname}` : ''}`,
          email: member.email,
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof DatabaseError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Error registering member" });
      }
    }
  },

  async registerMember(
    req: Request<
      {},
      {},
      Omit<
        Member,
        | "member_id"
        | "password_hash"
        | "total_hours"
        | "last_login"
        | "full_name"
      >
    >,
    res: Response
  ): Promise<void> {
    try {
      const {
        first_name,
        last_name,
        date_of_birth,
        gender,
        street_address,
        city,
        oib,
        cell_phone,
        email,
        life_status,
        tshirt_size,
        shell_jacket_size,
      } = req.body;

      // Provjeri postoji li član s istim OIB-om koristeći Prisma ORM
      const existingMember = await prisma.member.findUnique({ where: { oib } });
      if (existingMember) {
        res.status(400).json({
          message: "Member with this OIB already exists",
        });
        return;
      }

      // Formatiranje datuma rođenja u ispravan ISO-8601 DateTime format
      let formattedDateOfBirth = date_of_birth;
      
      // Provjeri je li date_of_birth samo datum (bez vremena)
      if (date_of_birth && typeof date_of_birth === 'string') {
        if (date_of_birth.length === 10) {
          // Koristi direktno ISO format bez ručnog formatiranja
          const parsedDate = parseDate(`${date_of_birth}T00:00:00.000Z`);
          formattedDateOfBirth = parsedDate.toISOString();
          console.log(`Formatiran datum rođenja: ${formattedDateOfBirth}`);
        } else {
          // Očisti ISO string od dodatnih navodnika ako postoje
          formattedDateOfBirth = cleanISODateString(date_of_birth);
          console.log(`Očišćen datum rođenja: ${formattedDateOfBirth}`);
        }
      }

      // Kreiraj novog člana koristeći Prisma ORM
      const member = await prisma.member.create({
        data: {
          first_name,
          last_name,
          full_name: `${first_name} ${last_name}`, // Puno ime je obavezno polje
          date_of_birth: formattedDateOfBirth,
          gender,
          street_address,
          city,
          oib,
          cell_phone,
          email,
          life_status,
          tshirt_size,
          shell_jacket_size,
          status: 'pending', // Novi član je uvijek na čekanju
          role: 'member',
        },
        select: { member_id: true }, // Vraćamo samo member_id
      });

      res.status(201).json({
        message: "Pristupnica zaprimljena. Administrator će te kontaktirati.",
        member_id: member.member_id,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        message:
          error instanceof Error ? error.message : "Registration failed",
      });
    }
  },

  async searchMembers(req: Request, res: Response): Promise<void> {
    try {
      const { searchTerm } = req.query;
      const userIP = req.ip || req.socket.remoteAddress || 'unknown';
      
      // Provjera važećeg upita
      if (typeof searchTerm !== "string" || !searchTerm) {
        res.status(400).json({ message: "Valid search term is required" });
        return;
      }
      
      // Dodatna provjera duljine (minimalno 3 znaka)
      if (searchTerm.length < 3) {
        res.status(400).json({ message: "Search term must be at least 3 characters long" });
        return;
      }
      
      // Zapisivanje pretrage u log za potrebe sigurnosne analize
      console.log(`Member search request from IP ${userIP}: "${searchTerm}"`);
      
      // Sprečavanje jednostavnih SQL injection pokušaja
      if (searchTerm.includes("'") || searchTerm.includes(";") || searchTerm.includes("--")) {
        console.warn(`Potential SQL injection attempt from IP ${userIP}: "${searchTerm}"`);
        res.status(400).json({ message: "Invalid search term" });
        return;
      }
      
      const results = await authRepository.searchMembers(searchTerm);
      
      // Dodatno logirajmo broj rezultata za sigurnosnu analizu
      console.log(`Search for "${searchTerm}" returned ${results.length} results`);
      
      res.json(results);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({
        message:
          error instanceof Error ? error.message : "Error searching members",
      });
    }
  },

  async assignCardNumber(
    req: Request<{}, {}, { member_id: number, card_number: string }>,
    res: Response
  ): Promise<void> {
    try {
      const { member_id, card_number } = req.body;

      // Dohvati postavke sustava za validaciju duljine broja kartice
      const settings = await prisma.systemSettings.findFirst({
        where: { id: 'default' }
      });
      const cardNumberLength = settings?.cardNumberLength || 5;

      // Dinamička validacija broja iskaznice prema postavkama
      const cardNumberRegex = new RegExp(`^\\d{${cardNumberLength}}$`);
      if (!cardNumberRegex.test(card_number)) {
        res.status(400).json({ message: `Card number must be exactly ${cardNumberLength} digits` });
        return;
      }

      const member = await authRepository.findUserById(member_id);
      if (!member) {
        res.status(404).json({ message: "Member not found" });
        return;
      }

      // Provjeri je li član već registriran
      if (member.registration_completed) {
        res.status(400).json({ message: "Can only assign card number for pending members" });
        return;
      }

      // Generiraj lozinku prema dinamičkom formatu
      const password = `${member.full_name}-isk-${card_number.padStart(cardNumberLength, '0')}`;
      console.log(`Generating password: "${password}" for member ${member_id}`);
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Ažuriraj podatke člana - lozinku, status, broj iskaznice
      await authRepository.updateMemberWithCardAndPassword(
        member_id, 
        hashedPassword, 
        card_number
      );

      res.json({
        message: "Card number assigned and password generated successfully",
        member_id,
        status: "registered",
        card_number
      });
    } catch (error) {
      console.error("Card number assignment error:", error);
      res.status(500).json({ message: "Error assigning card number" });
    }
  },

  async assignPassword(
    req: Request<{}, {}, { memberId: number; password: string }>,
    res: Response
  ): Promise<void> {
    try {
      const { memberId, password } = req.body;
      console.log("Received password assignment request for member:", memberId);
      const hashedPassword = await bcrypt.hash(password, 10);
      await authRepository.updateMemberWithCardAndPassword(memberId, hashedPassword, "");

      res.json({ message: "Password assigned successfully" });
    } catch (error) {
      console.error("Password assignment error:", error);
      res.status(500).json({ message: "Failed to assign password" });
    }
  },

  // Debug method for member information
  async debugMember(req: Request, res: Response): Promise<void | Response> {
    try {
      const memberId = parseInt(req.params.id);
      console.log(`Debug request for member ${memberId}`);
      
      const query = `
        SELECT 
          member_id, 
          first_name, 
          last_name, 
          full_name, 
          email, 
          status,
          registration_completed,
          CASE WHEN password_hash IS NULL THEN false ELSE true END as has_password
        FROM members
        WHERE member_id = $1
      `;
      
      const result = await db.query(query, [memberId]);
      
      if (result.rowCount === 0) {
        console.log(`No member found with ID: ${memberId}`);
        res.status(404).json({ message: 'Member not found' });
        return;
      }
      
      const member = result.rows[0];
      return res.json({ 
        member: result.rows[0],
        debug_note: "This endpoint is for development only"
      });
    } catch (error) {
      console.error('Debug endpoint error:', error);
      return res.status(500).json({ error: String(error) });
    }
  },

  // Funkcija za obnavljanje access tokena
  async refreshToken(req: Request, res: Response): Promise<void | Response> {
    await refreshTokenHandler(req, res);
  },

  // Funkcija za odjavu korisnika
  async logout(req: Request, res: Response): Promise<void | Response> {
    await logoutHandler(req, res);
  }

};

export default authController;