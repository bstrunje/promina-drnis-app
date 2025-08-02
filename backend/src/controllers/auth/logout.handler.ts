import { Request, Response } from 'express';
import prisma from '../../utils/prisma.js';
import { generateCookieOptions, generateClearCookieOptions } from './auth.utils.js';

// Funkcija za odjavu korisnika i poništavanje refresh tokena
export async function logoutHandler(req: Request, res: Response): Promise<void | Response> {
  const { refreshToken, systemManagerRefreshToken } = req.cookies;
  const tokenToClear = refreshToken || systemManagerRefreshToken;
  const cookieNameToClear = refreshToken ? 'refreshToken' : 'systemManagerRefreshToken';

  if (!tokenToClear) {
    // Ako nema tokena, samo vrati uspješan odgovor bez daljnjih akcija
    return res.status(200).json({ message: 'No active session to log out from' });
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

    return res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);

    // Čak i ako dođe do greške u bazi, pokušaj očistiti kolačić
    const cookieOptions = generateCookieOptions(req);
    res.clearCookie(cookieNameToClear, {
      ...cookieOptions,
      maxAge: 0, // Osiguraj brisanje kolačića
    });

    return res.status(500).json({ message: 'Logout failed due to a server error' });
  }
}
