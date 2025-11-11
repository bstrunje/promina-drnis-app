import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma.js';

// Rate limiting konfiguracija
const RATE_LIMIT_WINDOW_MINUTES = 15; // Vremensko razdoblje
const MAX_PIN_RESETS_PER_WINDOW = 5;   // Maksimalno reset-ova po razdoblju

// In-memory cache za brže provjere (opciono, može se i samo baza koristiti)
const resetAttempts = new Map<string, { count: number; firstAttempt: Date }>();

/**
 * Middleware za rate limiting PIN reset akcija
 * Sprječava abuse resetiranja PIN-ova od strane System Manager-a ili Superuser-a
 */
export const pinResetRateLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as { user?: { id?: number; type?: string; role?: string } }).user;
    
    if (!user || !user.id) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Kreiraj unique key za korisnika (System Manager ili Member)
    const userType = user.type === 'SystemManager' ? 'SM' : 'M';
    const userKey = `${userType}:${user.id}`;

    // Provjeri in-memory cache prvo
    const cached = resetAttempts.get(userKey);
    const now = new Date();

    if (cached) {
      const windowExpired = 
        (now.getTime() - cached.firstAttempt.getTime()) > 
        (RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);

      if (windowExpired) {
        // Window je istekao, reset counter
        resetAttempts.set(userKey, { count: 1, firstAttempt: now });
      } else {
        // Unutar window-a, provjeri count
        if (cached.count >= MAX_PIN_RESETS_PER_WINDOW) {
          const minutesRemaining = Math.ceil(
            (RATE_LIMIT_WINDOW_MINUTES - 
             (now.getTime() - cached.firstAttempt.getTime()) / 60000)
          );

          res.status(429).json({
            message: `Rate limit exceeded. Too many PIN reset attempts. Please try again in ${minutesRemaining} minute${minutesRemaining > 1 ? 's' : ''}.`,
            retryAfter: minutesRemaining * 60 // sekunde
          });
          return;
        } else {
          // Incrementaj counter
          cached.count += 1;
          resetAttempts.set(userKey, cached);
        }
      }
    } else {
      // Prvi pokušaj, kreiraj novi entry
      resetAttempts.set(userKey, { count: 1, firstAttempt: now });
    }

    // Također provjeri u bazi (za trajnu provjeru)
    // Ovo omogućava rate limiting čak i ako server restartuje
    const windowStart = new Date(now.getTime() - (RATE_LIMIT_WINDOW_MINUTES * 60 * 1000));

    const recentResets = await prisma.auditLog.count({
      where: {
        action_type: 'RESET_MEMBER_PIN',
        performed_by: user.id,
        created_at: {
          gte: windowStart
        }
      }
    });

    if (recentResets >= MAX_PIN_RESETS_PER_WINDOW) {
      res.status(429).json({
        message: `Rate limit exceeded. You have performed ${recentResets} PIN resets in the last ${RATE_LIMIT_WINDOW_MINUTES} minutes. Maximum allowed: ${MAX_PIN_RESETS_PER_WINDOW}.`,
        retryAfter: RATE_LIMIT_WINDOW_MINUTES * 60
      });
      return;
    }

    // Provjera je uspješna, nastavi s request-om
    next();
  } catch (error) {
    console.error('Error in PIN reset rate limit middleware:', error);
    // U slučaju greške, dopusti request (fail-open pristup)
    next();
  }
};

/**
 * Čišćenje stare in-memory cache (pozivati periodično)
 */
export const cleanupRateLimitCache = (): void => {
  const now = new Date();
  const expiredKeys: string[] = [];

  resetAttempts.forEach((value, key) => {
    const age = now.getTime() - value.firstAttempt.getTime();
    if (age > (RATE_LIMIT_WINDOW_MINUTES * 60 * 1000 * 2)) {
      // Dvostruko duži od window-a, sigurno može biti obrisan
      expiredKeys.push(key);
    }
  });

  expiredKeys.forEach(key => resetAttempts.delete(key));
  
  if (expiredKeys.length > 0) {
    console.log(`[RATE-LIMIT] Cleaned up ${expiredKeys.length} expired entries`);
  }
};

// Periodično čišćenje svakih 30 minuta
setInterval(cleanupRateLimitCache, 30 * 60 * 1000);
