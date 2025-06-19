import { Request } from "express";
import prisma from "../../utils/prisma.js"; // Potrebno za getCardNumberLength

// Funkcija za generiranje konzistentnih opcija kolačića
export const generateCookieOptions = (req: Request): any => {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // Production settings (assuming HTTPS)
    const origin = req.get('Origin');
    let isSecureFrontendInProd = false;
    if (origin) {
      try {
        const originUrl = new URL(origin);
        isSecureFrontendInProd = originUrl.protocol === 'https:';
      } catch (error) {
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

/**
 * Pomoćna funkcija za formatiranje teksta za minute u hrvatskom jeziku
 * (pravilno gramatičko sklanjanje riječi "minuta")
 */
export function formatMinuteText(minutes: number): string {
  if (minutes === 1) return 'minutu';
  if (minutes >= 2 && minutes <= 4) return 'minute';
  return 'minuta';
}

// Pomoćna funkcija za dohvat duljine broja kartice
export async function getCardNumberLength(): Promise<number> {
  const settings = await prisma.systemSettings.findFirst({
    where: { id: 'default' }
  });
  return settings?.cardNumberLength ?? 5; // Koristi 5 kao fallback ako je null ili undefined
}

// Ažurirana funkcija za validaciju lozinke
export async function validatePassword(
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
