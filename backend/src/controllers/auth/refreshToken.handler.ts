import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../../utils/prisma.js";
import { JWT_SECRET, REFRESH_TOKEN_SECRET } from '../../config/jwt.config.js';
import { formatUTCDate, getTokenExpiryDate } from '../../utils/dateUtils.js';
import {
  generateCookieOptions,
} from './auth.utils.js';

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
      
      await prisma.refresh_tokens.update({
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
      console.log('Razvojno okruženje: vraćam novi refresh token u odgovoru');
      res.json({ 
        accessToken,
        refreshToken: newRefreshToken
      });
    } else {
      res.json({ accessToken });
    }
  } catch (error) {
    console.error('Greška pri obnavljanju tokena:', error);
    res.status(403).json({ error: 'Refresh token nije valjan ili je došlo do interne greške servera pri obnavljanju tokena.' });
  }
}
