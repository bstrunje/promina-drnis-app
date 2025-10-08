// backend/src/utils/uploads.ts
// Pomoćne funkcije za centralizirano rukovanje upload direktorijima
// i provjeru konfiguracije storage-a.

import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

// ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Provjera je li konfiguriran Vercel Blob (produkcijski trajni storage)
export function isBlobConfigured(): boolean {
  const isProduction = process.env.NODE_ENV === 'production';
  const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN;
  return isProduction && hasToken;
}

// Dohvati bazni uploads direktorij, dosljedno za sve module
export function getUploadsDir(): string {
  // Ako je eksplicitno postavljen, koristi ga u svim okruženjima
  if (process.env.UPLOADS_DIR && process.env.UPLOADS_DIR.length > 0) {
    return process.env.UPLOADS_DIR;
  }

  // Produkcija: koristimo /tmp/uploads kao fallback za statiku (ephemeral)
  // Napomena: U produkciji, trajni upload ide na Vercel Blob ako je konfiguriran
  if (process.env.NODE_ENV === 'production') {
    return '/tmp/uploads';
  }

  // Razvoj (lokalno/Docker): koristi dist-relative uploads kao u app.ts
  // __dirname u buildu pokazuje na dist/src, pa '..' => dist/
  return path.resolve(__dirname, '..', 'uploads');
}

// Kreiraj bazne direktorije za uploade ako ne postoje
export async function ensureBaseUploadDirs(): Promise<void> {
  const base = getUploadsDir();
  const subdirs = [
    '',
    'organization_logos',
    'profile_images',
  ];

  for (const sub of subdirs) {
    const dir = sub ? path.join(base, sub) : base;
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch {
      // Ignoriramo ako već postoji ili nema privilegija; log nije nužan
    }
  }
}
