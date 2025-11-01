// backend/src/middleware/mockDateMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { setMockDate } from '../utils/dateUtils.js';

const isDev = process.env.NODE_ENV === 'development';

/**
 * Middleware koji čita mock date iz request header-a i postavlja ga za trenutni request
 * Koristi se samo u development modu za Time Traveler funkcionalnost
 */
export function mockDateMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!isDev) {
    next();
    return;
  }

  // Skip mock date za javne rute (org-config, login) da ne blokiramo pristup
  const publicRoutes = ['/api/org-config', '/api/auth/login', '/api/pwa'];
  const isPublicRoute = publicRoutes.some(route => req.path.startsWith(route));
  
  if (isPublicRoute) {
    next();
    return;
  }

  // Čitaj mock date iz header-a (frontend šalje kao ISO string)
  const mockDateHeader = req.headers['x-mock-date'] as string | undefined;

  if (mockDateHeader) {
    try {
      const mockDate = new Date(mockDateHeader);
      if (!isNaN(mockDate.getTime())) {
        setMockDate(mockDate);
        console.log(`[MOCK-DATE] ✅ Set to: ${mockDateHeader}`);
      } else {
        console.warn('[MOCK-DATE] ⚠️ Invalid date format:', mockDateHeader);
      }
    } catch (error) {
      console.error('[MOCK-DATE] ❌ Error parsing mock date:', mockDateHeader, error);
    }
  } else {
    // Ako nema mock date headera, resetiraj mock datum
    // setMockDate(null);
    // NAPOMENA: Ne resetiramo automatski jer želimo da mock datum ostane postavljen
    // između requestova dok korisnik eksplicitno ne resetira
  }

  next();
}
