import { Request } from "express";
import type { CookieOptions } from "express";
import prisma from "../../utils/prisma.js";
import { tOrDefault } from "../../utils/i18n.js";

// Funkcija za generiranje konzistentnih opcija kolačića
export const generateCookieOptions = (req: Request): CookieOptions => {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // Production settings (assuming HTTPS)
    const origin = req.get('Origin');
    let isSecureFrontendInProd = false;
    if (origin) {
      try {
        const originUrl = new URL(origin);
        isSecureFrontendInProd = originUrl.protocol === 'https:';
      } catch {
        // console.error('Invalid Origin header in prod:', origin);
      }
    }

    return {
      httpOnly: true,
      secure: true, // Production must be Secure
      sameSite: isSecureFrontendInProd ? 'none' : 'lax', // 'none' if frontend is HTTPS, 'lax' otherwise. Consider 'strict'.
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
      domain: process.env.COOKIE_DOMAIN || undefined, // Use COOKIE_DOMAIN if set, otherwise undefined
    };
  } else {
    // Development settings (HTTP localhost)
    return {
      httpOnly: true,
      secure: false, // Explicitly false for HTTP
      sameSite: 'lax', // Lax is standard and usually works for HTTP localhost
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    };
  }
};

// OPTIMIZACIJA: Funkcija za brisanje kolačića bez maxAge opcije (Express 5 kompatibilnost)
export const generateClearCookieOptions = (req: Request): CookieOptions => {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // Production settings (assuming HTTPS)
    const origin = req.get('Origin');
    let isSecureFrontendInProd = false;
    if (origin) {
      try {
        const originUrl = new URL(origin);
        isSecureFrontendInProd = originUrl.protocol === 'https:';
      } catch {
        // console.error('Invalid Origin header in prod:', origin);
      }
    }

    return {
      httpOnly: true,
      secure: true, // Production must be Secure
      sameSite: isSecureFrontendInProd ? 'none' : 'lax', // 'none' if frontend is HTTPS, 'lax' otherwise. Consider 'strict'.
      // maxAge se ne koristi s res.clearCookie() - Express 5 deprecation fix
      path: '/',
      domain: process.env.COOKIE_DOMAIN || undefined, // Use COOKIE_DOMAIN if set, otherwise undefined
    };
  } else {
    // Development settings (HTTP localhost)
    return {
      httpOnly: true,
      secure: false, // Explicitly false for HTTP
      sameSite: 'lax', // Lax is standard and usually works for HTTP localhost
      // maxAge se ne koristi s res.clearCookie() - Express 5 deprecation fix
      path: '/',
    };
  }
};

/**
 * Pomoćna funkcija za formatiranje teksta za minute u hrvatskom jeziku
 * (pravilno gramatičko sklanjanje riječi "minuta")
 */
export function formatMinuteText(minutes: number, locale: 'en' | 'hr' = 'hr'): string {
  if (locale === 'en') {
    return minutes === 1 ? 'minute' : 'minutes';
  }
  // Croatian plural forms
  if (minutes === 1) return 'minutu';
  if (minutes >= 2 && minutes <= 4) return 'minute';
  return 'minuta';
}

// Pomoćna funkcija za dohvat duljine broja kartice
export async function getCardNumberLength(organizationId: number): Promise<number> {
  const settings = await prisma.systemSettings.findFirst({
    where: { organization_id: organizationId }
  });
  return settings?.cardNumberLength ?? 5; // Koristi 5 kao fallback ako je null ili undefined
}

// Ažurirana funkcija za validaciju lozinke
export async function validatePassword(
  password: string,
  organizationId: number,
  suffixNumbers?: string
): Promise<{
  isValid: boolean;
  message?: string;
  formattedPassword?: string;
}> {
  if (password.length < 6) {
    return {
      isValid: false,
      message: tOrDefault('auth.errors.PASSWORD_TOO_SHORT', 'en', 'Password must be at least 6 characters long before the -isk- suffix'),
    };
  }

  if (suffixNumbers) {
    // Dohvati duljinu broja kartice iz postavki
    const cardNumberLength = await getCardNumberLength(organizationId);
    const cardNumberRegex = new RegExp(`^\\d{${cardNumberLength}}$`);
    
    if (!cardNumberRegex.test(suffixNumbers)) {
      return {
        isValid: false,
      message: tOrDefault('auth.errors.INVALID_SUFFIX_LENGTH', 'en', 'Suffix must be exactly {length} digits', { length: cardNumberLength.toString() }),
      };
    }
    return {
      isValid: true,
      formattedPassword: `${password}-isk-${suffixNumbers}`, // Add hyphen for consistency
    };
  }

  return { isValid: true };
}
