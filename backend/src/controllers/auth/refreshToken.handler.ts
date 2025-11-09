import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../../utils/prisma.js";
import { JWT_SECRET, REFRESH_TOKEN_SECRET } from '../../config/jwt.config.js';
import { formatUTCDate, getTokenExpiryDate } from '../../utils/dateUtils.js';
import {
  generateCookieOptions,
  generateClearCookieOptions,
} from './auth.utils.js';
import { tOrDefault } from "../../utils/i18n.js";

const isDev = process.env.NODE_ENV === 'development';

// Funkcija za obnavljanje access tokena pomoću refresh tokena
export async function refreshTokenHandler(req: Request, res: Response): Promise<void | Response> {
  if (isDev) console.log('Refresh token zahtjev primljen');
  if (isDev) console.log('Origin:', req.headers.origin);
  if (isDev) console.log('Cookies primljeni na backendu:', req.cookies);
  if (isDev) console.log('Cookies:', JSON.stringify(req.cookies));
  if (isDev) console.log('User-Agent:', req.headers['user-agent']);
  
  const refreshToken = req.cookies.refreshToken;
  const locale = req.locale;
  
  if (isDev) console.log('Provjera refresh tokena iz kolačića...');
  
  if (!refreshToken) {
    if (isDev) console.log('Refresh token nije pronađen u kolačiću');
    return res.status(401).json({ code: 'AUTH_REFRESH_TOKEN_INVALID', error: tOrDefault('auth.errorsByCode.AUTH_REFRESH_TOKEN_INVALID', locale, 'Refresh token nije pronađen') });
  }
  
  if (isDev) console.log('Refresh token pronađen u kolačiću:', refreshToken.substring(0, 20) + '...');
  
  try {
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as { 
        id: number, 
        role: string, 
        fingerprint?: string 
      };
      if (isDev) console.log('JWT verifikacija uspješna, decoded:', { id: decoded.id, role: decoded.role });
      
      if (decoded.fingerprint) {
        const userAgent = req.headers['user-agent'] || 'unknown';
        const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
        const currentFingerprint = Buffer.from(`${userAgent}:${clientIp}`).toString('base64').substring(0, 32);
        
        if (isDev) console.log('Provjera fingerprinta uređaja...');
        
        if (decoded.fingerprint !== currentFingerprint) {
          console.error('Fingerprint uređaja ne odgovara pohranjenom fingerprintu');
          if (isDev) console.log(`Token fingerprint: ${decoded.fingerprint.substring(0, 10)}...`);
          if (isDev) console.log(`Trenutni fingerprint: ${currentFingerprint.substring(0, 10)}...`);
          
          if (process.env.NODE_ENV === 'production') {
            return res.status(401).json({ code: 'AUTH_REFRESH_TOKEN_INVALID', error: tOrDefault('auth.errorsByCode.AUTH_REFRESH_TOKEN_INVALID', locale, 'Neispravan uređaj za refresh token') });
          } else {
            if (isDev) console.warn('Razlika u fingerprintu ignorirana u razvojnom okruženju');
          }
        } else {
          if (isDev) console.log('Fingerprint uređaja uspješno verificiran');
        }
      }
    } catch (jwtError) {
      console.error('JWT verifikacija nije uspjela:', jwtError);
      return res.status(401).json({ code: 'AUTH_REFRESH_TOKEN_INVALID', error: tOrDefault('auth.errorsByCode.AUTH_REFRESH_TOKEN_INVALID', locale, 'Neispravan refresh token') });
    }
    
    if (!prisma.refresh_tokens) {
      console.error('RefreshToken model nije dostupan u Prisma klijentu!');
      if (isDev) console.log('Dostupni modeli u Prisma klijentu:', Object.keys(prisma));
      res.status(500).json({ code: 'AUTH_SERVER_ERROR', error: tOrDefault('auth.errorsByCode.AUTH_SERVER_ERROR', locale, 'Interna greška servera') });
      return;
    }
    
    if (isDev) console.log(`Tražim refresh token u bazi za korisnika ID: ${decoded.id}`);
    
    let storedToken = await prisma.refresh_tokens.findFirst({
      where: { 
        token: refreshToken,
        member_id: decoded.id
      }
    });
    
    if (isDev) console.log('Rezultat pretrage tokena:', storedToken ? `Token pronađen (ID: ${storedToken.id})` : 'Token nije pronađen');
    
    if (!storedToken) {
      console.error(`Refresh token nije pronađen u bazi za korisnika ID: ${decoded.id}`);
      if (isDev) console.log('Token je valjan ali nije u bazi - odbacujem zahtjev');
      
      // JEDNOSTAVNO RJEŠENJE: Ako token nije u bazi, odbaci zahtjev
      // Korisnik će se morati ponovno prijaviti
      res.status(401).json({ code: 'AUTH_REFRESH_TOKEN_INVALID', error: tOrDefault('auth.errorsByCode.AUTH_REFRESH_TOKEN_INVALID', locale, 'Refresh token nije valjan ili je istekao') });
      return;
    }
    
    if (storedToken.expires_at) {
      const currentDate = new Date();
      const expiryDate = new Date(storedToken.expires_at);
      
      if (isDev) console.log(`Provjera isteka tokena: trenutno vrijeme=${formatUTCDate(currentDate)}, vrijeme isteka=${formatUTCDate(expiryDate)}`);
      
      if (currentDate > expiryDate) {
        console.error(`Refresh token je istekao u bazi podataka: ${formatUTCDate(expiryDate)}`);
        
        // Koristimo deleteMany umjesto delete da izbjegnemo grešku ako token ne postoji
        const deleteResult = await prisma.refresh_tokens.deleteMany({
          where: { id: storedToken.id }
        });
        
        if (isDev) console.log(`Obrisano ${deleteResult.count} isteklih tokena`);
        
        res.status(401).json({ code: 'AUTH_REFRESH_TOKEN_EXPIRED', error: tOrDefault('auth.errorsByCode.AUTH_REFRESH_TOKEN_EXPIRED', locale, 'Refresh token je istekao') });
        return;
      }
    }
    
    const member = await prisma.member.findUnique({ 
      where: { member_id: decoded.id } 
    });
    
    if (!member) {
      console.error(`Korisnik s ID ${decoded.id} nije pronađen u bazi`);
      res.status(403).json({ code: 'AUTH_USER_NOT_FOUND', error: tOrDefault('auth.errorsByCode.AUTH_USER_NOT_FOUND', locale, 'Korisnik nije pronađen') });
      return;
    }
    
    if (isDev) console.log(`Korisnik pronađen: ID=${member.member_id}, uloga=${member.role}`);
    
    const accessToken = jwt.sign(
      { id: member.member_id, role: member.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    const userAgent = req.headers['user-agent'] || 'unknown';
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const deviceFingerprint = Buffer.from(`${userAgent}:${clientIp}`).toString('base64').substring(0, 32);
    
    if (isDev) console.log('Generiran fingerprint uređaja za token');
    
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
    
    if (isDev) console.log(`[REFRESH-TOKEN] Rotiram refresh token s grace periodom (čuvam stari kratko vrijeme)`);
    
    try {
      const expiresAt = getTokenExpiryDate(7);
      
      // GRACE PERIOD PRISTUP: Ne brišemo stari token odmah.
      // U serverless okruženju moramo imati duži grace period zbog race conditions
      if (isDev) console.log(`[REFRESH-TOKEN] Kreiram novi token za člana ${member.member_id}`);
      
      // PRODUKCIJSKA SIGURNOST: 10 minuta grace period za serverless
      const GRACE_MS = 10 * 60 * 1000; // 10 minuta grace period
      const graceCutoff = new Date(Date.now() - GRACE_MS);
      
      // PRVO: Obriši stare tokene PRIJE kreiranja novog (smanjuje šansu za race condition)
      const cleanupBefore = await prisma.refresh_tokens.deleteMany({
        where: {
          member_id: member.member_id,
          token: { not: refreshToken }, // Zadrži trenutni token
          created_at: { lt: graceCutoff } // Obriši samo tokene starije od grace period-a
        }
      });
      
      if (isDev) console.log(`[REFRESH-TOKEN] Pre-cleanup: obrisano ${cleanupBefore.count} starih tokena`);
      
      // DRUGO: Kreiraj novi token
      const newTokenRecord = await prisma.refresh_tokens.create({
        data: {
          token: newRefreshToken,
          member_id: member.member_id,
          expires_at: expiresAt
        }
      });
      
      if (isDev) console.log(`[REFRESH-TOKEN] Novi token kreiran s ID: ${newTokenRecord.id}, isteka: ${formatUTCDate(expiresAt)}`);
      
      // Ažuriramo storedToken referencu za daljnju upotrebu
      storedToken = newTokenRecord;
      
      // TREĆE: Obriši stari token koji je upravo korišten (nakon što je novi kreiran)
      // Ovo radi NAKON kreiranja novog tokena, tako da uvijek imamo valjan token u bazi
      const cleanupOld = await prisma.refresh_tokens.deleteMany({
        where: {
          member_id: member.member_id,
          token: refreshToken, // Samo token koji je upravo korišten
          id: { not: newTokenRecord.id } // Ne briši novi token
        }
      });
      
      if (isDev) console.log(`[REFRESH-TOKEN] Post-cleanup: obrisan stari token (${cleanupOld.count} tokena)`);
      
      // DODATNA ZAŠTITA: Limitiraj broj aktivnih tokena po korisniku (max 5 uređaja)
      const tokenCount = await prisma.refresh_tokens.count({
        where: { member_id: member.member_id }
      });
      
      if (tokenCount > 5) {
        // Obriši najstarije tokene ako ih ima više od 5
        const oldestTokens = await prisma.refresh_tokens.findMany({
          where: { 
            member_id: member.member_id,
            id: { not: newTokenRecord.id } // Ne briši upravo kreirani token
          },
          orderBy: { created_at: 'asc' },
          take: tokenCount - 5 // Smanji na 5 tokena
        });
        
        if (oldestTokens.length > 0) {
          await prisma.refresh_tokens.deleteMany({
            where: {
              id: { in: oldestTokens.map(t => t.id) }
            }
          });
          
          if (isDev) console.log(`[REFRESH-TOKEN] Obrisano ${oldestTokens.length} najstarijih tokena (limit: 5 uređaja)`);
        }
      }
      
      const verifyToken = await prisma.refresh_tokens.findFirst({
        where: { token: newRefreshToken }
      });
      
      if (verifyToken) {
        if (isDev) console.log(`[REFRESH-TOKEN] Potvrda: novi token je u bazi (ID: ${verifyToken.id})`);
      } else {
        if (isDev) console.error('[REFRESH-TOKEN] KRITIČNA GREŠKA: novi token nije pronađen u bazi nakon kreiranja!');
      }
    } catch (error) {
      if (isDev) console.error('[REFRESH-TOKEN] Greška pri rotaciji refresh tokena s grace periodom:', error);
      throw error;
    }
    
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (req.cookies.systemManagerRefreshToken) {
      if (isDev) console.log('Brišem systemManagerRefreshToken kolačić za izbjegavanje konflikta');
      const systemManagerCookieOptions = generateClearCookieOptions(req);
      res.clearCookie('systemManagerRefreshToken', systemManagerCookieOptions);
    }
    
    if (req.cookies.refreshToken) {
      if (isDev) console.log('Brišem stari refreshToken kolačić prije postavljanja novog');
      const memberCookieOptions = generateClearCookieOptions(req);
      res.clearCookie('refreshToken', memberCookieOptions);
    }
    
    const cookieOptions = generateCookieOptions(req);
    
    res.cookie('refreshToken', newRefreshToken, cookieOptions);
    
    if (isDev) console.log('Postavljen novi refresh token kolačić s opcijama:', cookieOptions);
    
    // U development okruženju vraćamo i refresh token u JSON-u za lakše testiranje
    if (!isProduction) {
      if (isDev) console.log('Razvojno okruženje: vraćam novi refresh token u odgovoru');
      res.json({ 
        accessToken,
        refreshToken: newRefreshToken
      });
    } else {
      // U produkciji samo access token, refresh token je u kolačiću
      res.json({ accessToken });
    }
  } catch (error) {
    console.error('Greška pri obnavljanju tokena:', error);
    return res.status(403).json({ code: 'AUTH_REFRESH_TOKEN_INVALID', error: tOrDefault('errorsByCode.AUTH_REFRESH_TOKEN_INVALID', locale, 'Refresh token nije valjan ili je došlo do interne greške servera pri obnavljanju tokena.') });
  }
}
