// Lokalna nadogradnja Express Request tipa za req.locale
// Napomena: samo tipizacija, ne mijenja runtime ponašanje

import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    // Jezik detektiran u middleware/locale.ts (npr. 'hr' | 'en')
    // OBAVEZNO: localeMiddleware ga uvijek postavlja za sve API pozive
    locale: 'en' | 'hr';
  }
}
