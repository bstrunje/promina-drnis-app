// backend/src/utils/i18n.ts
// Jednostavan i18n helper za backend bez dodatnih ovisnosti
// Koristi JSON resurse u backend/src/locales/{en,hr}/common.json

import fs from 'fs';
import path from 'path';

export type Locale = 'en' | 'hr';

const cache: Record<string, unknown> = {};

function loadLocale(locale: Locale): Record<string, unknown> {
  const key = `common:${locale}`;
  if (cache[key]) return cache[key] as Record<string, unknown>;
  const file = path.join(process.cwd(), 'backend', 'src', 'locales', locale, 'common.json');
  try {
    const content = fs.readFileSync(file, 'utf-8');
    const json = JSON.parse(content) as Record<string, unknown>;
    cache[key] = json;
    return json;
  } catch (_e) {
    // Fallback na en ako nešto pođe po zlu
    if (locale !== 'en') return loadLocale('en');
    return {} as Record<string, unknown>;
  }
}

export function detectLocale(acceptLanguage?: string | null): Locale {
  if (!acceptLanguage) return 'en';
  const lower = acceptLanguage.toLowerCase();
  if (lower.startsWith('hr')) return 'hr';
  return 'en';
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, p1) => String(params[p1] ?? ''));
}

export function tBackend(key: string, locale: Locale, params?: Record<string, string | number>): string {
  const data = loadLocale(locale);
  const segments = key.split('.');
  let node: unknown = data;
  for (const s of segments) {
    if (node && typeof node === 'object' && s in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[s];
    } else {
      node = undefined;
      break;
    }
  }
  if (typeof node === 'string') {
    return interpolate(node, params);
  }
  // fallback na key ako nema prijevoda
  return key;
}
