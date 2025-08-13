// backend/src/utils/i18n.ts
// Poboljšani i18n helper za backend s podrškom za više namespace-a
// Koristi JSON resurse u backend/src/locales/{en,hr}/*.json

import fs from 'fs';
import path from 'path';

export type Locale = 'en' | 'hr';

const cache: Record<string, unknown> = {};

/**
 * Učitava prijevode za određeni jezik i namespace
 * @param locale Jezik (en/hr)
 * @param namespace Namespace (npr. 'common', 'auth', 'validations')
 */
function loadNamespace(locale: Locale, namespace: string): Record<string, unknown> {
  const cacheKey = `${namespace}:${locale}`;
  
  // Vrati iz cache-a ako postoji
  if (cache[cacheKey]) {
    return cache[cacheKey] as Record<string, unknown>;
  }

  const file = path.join(process.cwd(), 'backend', 'src', 'locales', locale, `${namespace}.json`);
  
  try {
    if (!fs.existsSync(file)) {
      // Ako datoteka ne postoji, vrati prazan objekt
      return {};
    }
    
    const content = fs.readFileSync(file, 'utf-8');
    const json = JSON.parse(content) as Record<string, unknown>;
    
    // Spremi u cache
    cache[cacheKey] = json;
    
    return json;
  } catch (error) {
    console.error(`Error loading ${namespace} for locale ${locale}:`, error);
    // Fallback na prazan objekt
    return {};
  }
}

/**
 * Detektira jezik iz Accept-Language headera
 */
export function detectLocale(acceptLanguage?: string | null): Locale {
  if (!acceptLanguage) return 'en';
  const lower = acceptLanguage.toLowerCase();
  if (lower.startsWith('hr')) return 'hr';
  return 'en';
}

/**
 * Zamjenjuje placeholdere u stringu s vrijednostima iz params objekta
 */
function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, p1) => String(params[p1] ?? ''));
}

/**
 * Glavna funkcija za prevodenje s podrškom za namespace
 * @param key Ključ u formatu 'namespace.key' ili 'key' (za common namespace)
 * @param locale Jezik
 * @param params Parametri za interpolaciju
 */
export function tBackend(
  key: string,
  locale: Locale = 'en',
  params?: Record<string, string | number>
): string {
  // Odvoji namespace i ključ ako je naveden
  const [namespace, ...keyParts] = key.split('.');
  const finalKey = keyParts.join('.');
  
  // Ako nema točke u ključu, koristi 'common' kao defaultni namespace
  const ns = keyParts.length > 0 ? namespace : 'common';
  const actualKey = keyParts.length > 0 ? finalKey : key;
  
  // Učitaj prijevode za traženi namespace
  const translations = loadNamespace(locale, ns);
  
  // Pronađi prijevod
  const segments = actualKey.split('.');
  let node: unknown = translations;
  
  for (const segment of segments) {
    if (node && typeof node === 'object' && segment in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[segment];
    } else {
      // Ako nije pronađeno, probaj u common namespace-u (osim ako već jesmo u njemu)
      if (ns !== 'common') {
        const commonTranslations = loadNamespace(locale, 'common');
        const commonValue = segments.reduce<unknown>((acc, seg) => {
          if (acc && typeof acc === 'object' && seg in (acc as Record<string, unknown>)) {
            return (acc as Record<string, unknown>)[seg];
          }
          return undefined;
        }, commonTranslations);
        
        if (typeof commonValue === 'string') {
          return interpolate(commonValue, params);
        }
      }
      
      // Ako nema prijevoda, vrati ključ
      return key;
    }
  }
  
  // Ako je pronađen string, vrati ga s interpolacijom
  if (typeof node === 'string') {
    return interpolate(node, params);
  }
  
  // Inače vrati ključ
  return key;
}

/**
 * Vraća prijevod ili zadani tekst ako ključ ne postoji
 */
export function tOrDefault(
  key: string,
  locale: Locale,
  defaultMessage: string,
  params?: Record<string, string | number>
): string {
  const translated = tBackend(key, locale, params);
  if (translated === key || !translated) {
    return interpolate(defaultMessage, params);
  }
  return translated;
}

/**
 * Eksplicitna funkcija za prijevode s određenim namespace-om
 */
export function tNamespace(
  namespace: string,
  key: string,
  locale: Locale,
  params?: Record<string, string | number>
): string {
  return tBackend(`${namespace}.${key}`, locale, params);
}

/**
 * Inicijalizira sve namespace-ove za određeni jezik
 * Korisno za preloading prijevoda
 */
export function preloadLocales(locale: Locale, namespaces: string[] = ['common', 'auth', 'validations']): void {
  namespaces.forEach(ns => loadNamespace(locale, ns));
}
