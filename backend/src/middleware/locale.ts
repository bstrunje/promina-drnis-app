import { Request, Response, NextFunction } from 'express';

// Multi-tenant language detection za backend
// Prioritet: 
// 1. X-Lang header (hr|en) - za eksplicitno override (npr. SystemManager koji je uvijek 'en')
// 2. Organization default_language - jezik organizacije (multi-tenancy)
// 3. Accept-Language header - fallback ako nema organizacije
export function localeMiddleware(req: Request, _res: Response, next: NextFunction) {
  // SystemManager ili eksplicitni override kroz header
  const headerLang = (req.headers['x-lang'] || req.headers['x-language']) as string | undefined;
  if (headerLang) {
    const locale = headerLang.toString().toLowerCase();
    if (locale === 'hr' || locale === 'en') {
      req.locale = locale;
      return next();
    }
  }

  // Multi-tenancy: Koristi jezik organizacije ako je dostupan
  if (req.organization?.default_language) {
    const orgLang = req.organization.default_language.toLowerCase();
    if (orgLang === 'hr' || orgLang === 'en') {
      req.locale = orgLang as 'en' | 'hr';
      return next();
    }
  }

  // Fallback: Accept-Language header
  const accept = (req.headers['accept-language'] as string | undefined) || '';
  const first = accept.split(',')[0]?.trim();
  let locale = 'en'; // krajnji fallback
  
  if (first) {
    const lang = first.toLowerCase().split('-')[0];
    if (lang === 'hr' || lang === 'en') {
      locale = lang;
    }
  }

  req.locale = locale as 'en' | 'hr';
  next();
}
