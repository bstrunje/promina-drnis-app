// middleware/sanitization.middleware.ts
import type { Request, Response, NextFunction } from 'express';
import { sanitizeResponseData } from '../utils/sanitization.js';

/**
 * Global Response Sanitization Middleware
 * 
 * Automatski sanitizira SVE response-ove koji sadrže member podatke.
 * Uklanja osjetljiva polja (OIB, telefon, email, adresa) za obične korisnike.
 * 
 * Izuzeci:
 * - Admin korisnici vide SVE
 * - Korisnik vidi SVE u svom profilu
 * - System Manager endpointi se ne sanitiziraju
 */
export const sanitizationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Preskoči System Manager rute - imaju vlastitu logiku
  if (req.path.startsWith('/api/system-manager')) {
    next();
    return;
  }

  // Preskoči login/auth rute
  if (req.path.includes('/login') || req.path.includes('/auth')) {
    next();
    return;
  }

  // Intercept original res.json() metodu
  const originalJson = res.json.bind(res);

  // Override res.json() da automatski sanitizira podatke
  res.json = function (data: unknown): Response {
    try {
      // Dohvati user info iz requesta
      const requestingUserId = req.user?.id;
      const requestingUserRole = req.user?.role;

      // Sanitiziraj response data - ukloni osjetljiva polja prema roli
      const sanitizedData = sanitizeResponseData(
        data,
        requestingUserId,
        requestingUserRole
      );

      // Pozovi original json() sa sanitiziranim podacima
      return originalJson(sanitizedData);
    } catch (error) {
      // Ako sanitizacija faila, vrati original data (failsafe)
      console.error('[SANITIZATION] Greška pri sanitizaciji response-a:', error);
      return originalJson(data);
    }
  };

  next();
};
