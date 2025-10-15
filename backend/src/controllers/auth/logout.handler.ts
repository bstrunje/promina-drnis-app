import { Request, Response } from 'express';
import prisma from '../../utils/prisma.js';
import { generateCookieOptions } from './auth.utils.js';
import { tOrDefault } from '../../utils/i18n.js';

// Funkcija za odjavu korisnika i poništavanje refresh tokena
export async function logoutHandler(req: Request, res: Response): Promise<void | Response> {
  const locale = req.locale;
  const { refreshToken, systemManagerRefreshToken } = req.cookies;
  const tokenToClear = refreshToken || systemManagerRefreshToken;
  const cookieNameToClear = refreshToken ? 'refreshToken' : 'systemManagerRefreshToken';

  if (!tokenToClear) {
    // Ako nema tokena, samo vrati uspješan odgovor bez daljnjih akcija
    return res.status(200).json({ message: tOrDefault('success.AUTH_LOGOUT_OK', locale, 'Logout successful') });
  }

  try {
    // Ukloni refresh token iz baze podataka
    await prisma.refresh_tokens.deleteMany({
      where: { token: tokenToClear },
    });

    // Očisti kolačić na klijentskoj strani
    const cookieOptions = generateCookieOptions(req);
    res.clearCookie(cookieNameToClear, {
      ...cookieOptions,
      maxAge: 0, // Eksplicitno postavljanje maxAge na 0
    });

    return res.status(200).json({ message: tOrDefault('success.AUTH_LOGOUT_OK', locale, 'Logout successful') });
  } catch (error) {
    console.error('Logout error:', error);

    // Čak i ako dođe do greške u bazi, pokušaj očistiti kolačić
    const cookieOptions = generateCookieOptions(req);
    res.clearCookie(cookieNameToClear, {
      ...cookieOptions,
      maxAge: 0, // Osiguraj brisanje kolačića
    });

    return res.status(500).json({ code: 'AUTH_LOGOUT_FAILED', message: tOrDefault('auth.errorsByCode.AUTH_LOGOUT_FAILED', locale, 'Logout failed due to a server error') });
  }
}
