import rateLimit, { Options as RateLimitOptions } from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma.js';
import { getOrganizationId } from './tenant.middleware.js';

/**
 * Kreira middleware za ograničavanje broja zahtjeva
 * @param options Opcije za konfiguraciju rate limitinga
 * @returns Middleware funkcija za rate limiting
 */
export const createRateLimit = (options?: Partial<RateLimitOptions>) => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minuta
    max: 100, // ograniči svaku IP adresu na 100 zahtjeva po windowMs
    standardHeaders: true, // Vraća standardne X-RateLimit-* zaglavlja
    legacyHeaders: false, // Onemogući X-RateLimit-* zaglavlja
    ...options
  });
};

/**
 * Tenant-aware limiter za registracijske zahtjeve.
 * Čita postavke iz SystemSettings i omogućuje isključivanje/konfiguraciju po tenant-u.
 */
export const createTenantAwareRegistrationRateLimit = () => {
  // Vraćamo middleware koji će dinamički odlučiti što napraviti za svaki zahtjev
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Pokušaj dohvatiti organization_id iz req (tenant param/proxy)
      let organizationId: number | null = null;
      try {
        organizationId = getOrganizationId(req);
      } catch {
        organizationId = null;
      }

      if (!organizationId) {
        // Ako nema tenanta, primijeni konzervativni limiter (isti kao stari default)
        return rateLimit({
          windowMs: 60 * 60 * 1000,
          max: 5,
          standardHeaders: true,
          legacyHeaders: false,
          message: { error: 'Too many registration attempts, please try again later' }
        })(req, res, next);
      }

      // Dohvati postavke za tenant
      const settings = await prisma.systemSettings.findUnique({
        where: { organization_id: organizationId }
      });

      // Ako nema postavki, koristi default konzervativni limiter
      if (!settings) {
        return rateLimit({
          windowMs: 60 * 60 * 1000,
          max: 5,
          standardHeaders: true,
          legacyHeaders: false,
          message: { error: 'Too many registration attempts, please try again later' }
        })(req, res, next);
      }

      // Ako je limiter isključen u postavkama → preskoči limitiranje
      if (settings.registrationRateLimitEnabled === false) {
        return next();
      }

      // Primijeni vrijednosti iz postavki (uz fallback na razumne defaulte)
      const windowMs = settings.registrationWindowMs ?? 60 * 60 * 1000;
      const max = settings.registrationMaxAttempts ?? 5;

      return rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Too many registration attempts, please try again later' }
      })(req, res, next);
    } catch (_error) {
      // Ako dođe do greške, nemoj blokirati registraciju – proslijedi dalje
      // (alternativno bi se moglo primijeniti stroži default)
      return next();
    }
  };
};

/**
 * Kreira middleware za ograničavanje broja zahtjeva za osvježavanje tokena
 * Stroža ograničenja za refresh token zahtjeve radi sprječavanja zlouporabe
 * @returns Middleware funkcija za rate limiting refresh token zahtjeva
 */
export const createRefreshTokenRateLimit = () => {
  return rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minuta
    max: 10, // ograniči svaku IP adresu na 10 zahtjeva za osvježavanje tokena u 5 minuta
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Previše pokušaja osvježavanja tokena. Molimo pokušajte ponovno kasnije.' },
    skipSuccessfulRequests: true, // Ne računa uspješne zahtjeve u ograničenje
    keyGenerator: (req) => {
      // Koristi kombinaciju IP adrese i member_id ako je dostupan u decodiranom tokenu
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      
      // Pokušaj dohvatiti member_id iz kolačića
      let memberId = 'unknown';
      try {
        if (req.cookies && req.cookies.refreshToken) {
          const refreshToken = req.cookies.refreshToken;
          // Dohvati samo payload bez verifikacije potpisa
          const tokenParts = refreshToken.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
            if (payload && payload.id) {
              memberId = payload.id.toString();
            }
          }
        }
      } catch (_error) {
        // Ignoriramo greške pri parsiranju tokena
      }
      
      return `${ip}:${memberId}`;
    }
  });
};