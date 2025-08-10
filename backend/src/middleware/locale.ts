import { Request, Response, NextFunction } from 'express';

// Jednostavna detekcija jezika za backend
// Prioritet: X-Lang header (hr|en), zatim Accept-Language (prvi jezik), fallback: en
export function localeMiddleware(req: Request, _res: Response, next: NextFunction) {
  const headerLang = (req.headers['x-lang'] || req.headers['x-language']) as string | undefined;
  let locale = (headerLang || '').toString().toLowerCase();

  if (!locale) {
    const accept = (req.headers['accept-language'] as string | undefined) || '';
    // Uzmemo prvi jezik prije zareza i bez regionalnih nastavaka (hr-HR -> hr)
    const first = accept.split(',')[0]?.trim();
    if (first) {
      locale = first.toLowerCase().split('-')[0];
    }
  }

  if (locale !== 'hr' && locale !== 'en') {
    locale = 'en'; // fallback
  }

  // Pohranimo na req za korištenje u kontrolerima
  req.locale = locale as 'en' | 'hr';
  next();
}
