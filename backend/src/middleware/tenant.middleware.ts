/**
 * TENANT IDENTIFICATION MIDDLEWARE
 * 
 * Automatski identificira organizaciju na temelju subdomene i postavlja
 * tenant context za sve API pozive.
 * 
 * Primjeri:
 * - promina.localhost:3001 → organization_id = 1 (PD Promina)
 * - test.localhost:3001 → organization_id = 2 (Test organizacija)
 * - promina-drnis.vercel.app → organization_id = 1
 */

import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma.js';
import jwt from 'jsonwebtoken';

// Proširujemo Express Request interface koristeći module augmentation
declare module 'express-serve-static-core' {
  interface Request {
    organizationId?: number;
    organization?: {
      id: number;
      name: string;
      subdomain: string;
      short_name: string;
      is_active: boolean;
      logo_path: string | null;
      primary_color: string | null;
      secondary_color: string | null;
      // PWA polja
      pwa_name: string | null;
      pwa_short_name: string | null;
      pwa_theme_color: string | null;
      pwa_background_color: string | null;
      pwa_icon_192_url: string | null;
      pwa_icon_512_url: string | null;
      // Ostala polja
      default_language: string;
      email: string;
      phone: string | null;
      website_url: string | null;
      street_address: string | null;
      city: string | null;
      postal_code: string | null;
      country: string | null;
      ethics_code_url: string | null;
      privacy_policy_url: string | null;
      membership_rules_url: string | null;
    };
  }

}

// Tip za JWT payload koji očekujemo u Authorization headeru
interface JwtPayload {
  organizationId?: number;
  organization?: {
    id: number;
    name: string;
    subdomain?: string;
  };
}

interface TenantContext {
  organizationId: number;
  organization: {
    id: number;
    name: string;
    subdomain: string;
    short_name: string;
    is_active: boolean;
    logo_path: string | null;
    primary_color: string | null;
    secondary_color: string | null;
    // PWA polja
    pwa_name: string | null;
    pwa_short_name: string | null;
    pwa_theme_color: string | null;
    pwa_background_color: string | null;
    pwa_icon_192_url: string | null;
    pwa_icon_512_url: string | null;
    // Ostala polja
    default_language: string;
    email: string;
    phone: string | null;
    website_url: string | null;
    street_address: string | null;
    city: string | null;
    postal_code: string | null;
    country: string | null;
    ethics_code_url: string | null;
    privacy_policy_url: string | null;
    membership_rules_url: string | null;
  };
}

/**
 * Cache za organizacije (u memoriji)
 * Ovo sprječava česte DB pozive za istu subdomenu
 */
const organizationCache = new Map<string, TenantContext>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minuta

/**
 * Izvlači org slug iz URL path-a (path-based multi-tenancy)
 * Primjeri:
 * - /promina/api/members → 'promina'
 * - /split/dashboard → 'split'
 * - /system-manager/login → null (izuzeće)
 */
function extractOrgSlugFromPath(path: string): string | null {
  if (!path || path === '/') return null;
  
  // Ukloni leading slash
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  
  // Split po slash
  const parts = cleanPath.split('/');
  
  if (parts.length === 0) return null;
  
  const orgSlug = parts[0];
  
  // Izuzeci - infrastrukturne rute koje ne pripadaju nijednoj organizaciji
  // Path-based tenant extraction radi SAMO za frontend rute (/:orgSlug/...)
  // API pozivi dolaze bez org prefiksa i koriste query parameter
  const excludedPrefixes = ['api', 'uploads', 'health', 'system-manager'];
  if (excludedPrefixes.includes(orgSlug)) {
    return null;
  }
  
  // Osnovni format check (slova, brojevi, crtice)
  const validSlugRegex = /^[a-z0-9-]+$/;
  if (!validSlugRegex.test(orgSlug)) {
    return null;
  }
  
  return orgSlug;
}

/**
 * Izvlači subdomenu iz host header-a
 */
function extractSubdomain(host: string): string | null {
  if (!host) return null;

  // Ukloni port ako postoji
  const hostWithoutPort = host.split(':')[0];
  
  // Različiti formati:
  // localhost → null (nema subdomenu)
  // promina.localhost → 'promina'
  // promina-drnis.vercel.app → 'promina-drnis'
  // test.example.com → 'test'
  
  const parts = hostWithoutPort.split('.');
  
  if (parts.length < 2) {
    return null; // localhost, 127.0.0.1, itd.
  }
  
  if (parts.length === 2) {
    return null; // example.com (nema subdomenu)
  }
  
  // Uzmi prvi dio kao subdomenu
  return parts[0];
}

/**
 * Dohvaća organizaciju iz cache-a ili baze podataka
 */
async function getOrganizationBySubdomain(subdomain: string): Promise<TenantContext | null> {
  // Provjeri cache
  const cached = organizationCache.get(subdomain);
  if (cached) {
    return cached;
  }

  try {
    // Dohvati iz baze
    const organization = await prisma.organization.findUnique({
      where: { 
        subdomain: subdomain,
        is_active: true 
      },
      select: {
        id: true,
        name: true,
        subdomain: true,
        short_name: true,
        is_active: true,
        logo_path: true,
        primary_color: true,
        secondary_color: true,
        // PWA polja
        pwa_name: true,
        pwa_short_name: true,
        pwa_theme_color: true,
        pwa_background_color: true,
        pwa_icon_192_url: true,
        pwa_icon_512_url: true,
        // Ostala polja
        default_language: true,
        email: true,
        phone: true,
        website_url: true,
        street_address: true,
        city: true,
        postal_code: true,
        country: true,
        ethics_code_url: true,
        privacy_policy_url: true,
        membership_rules_url: true
      }
    });

    if (!organization) {
      return null;
    }

    const context: TenantContext = {
      organizationId: organization.id,
      organization: organization as TenantContext['organization']
    };

    // Spremi u cache
    organizationCache.set(subdomain, context);
    
    // Ukloni iz cache-a nakon TTL
    setTimeout(() => {
      organizationCache.delete(subdomain);
    }, CACHE_TTL);

    return context;
  } catch (error) {
    console.error('[TENANT-MIDDLEWARE] Greška pri dohvaćanju organizacije:', error);
    return null;
  }
}

// Uklonjen development fallback: eksplicitni tenant je obavezan

/**
 * Tenant Identification Middleware
 */
export async function tenantMiddleware(
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> {
  try {
    const host = req.get('host') || req.headers.host as string;
    const path = req.path;

    // 🔧 IZUZEĆE: Global System Manager rute ne trebaju tenant context
    // jer Global System Manager može kreirati organizacije
    // Organization-specific SM rute (s ?tenant= parametrom) TREBAJU tenant!
    if (path.startsWith('/system-manager') && !req.query.tenant && !req.query.branding) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[TENANT-MIDDLEWARE] Global System Manager ruta (bez tenant param) - preskačem tenant detekciju: ${path}`);
      }
      return next();
    }

    // 🔧 IZUZEĆE: Development rute (/dev) ne trebaju tenant context
    // Koriste se za Time Traveler i ostale dev funkcionalnosti
    if (path.startsWith('/dev')) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[TENANT-MIDDLEWARE] Development ruta - preskačem tenant detekciju: ${path}`);
      }
      return next();
    }

    // 🔧 IZUZEĆE: Members napredni filteri (/members/functions, /members/skills)
    // Prioritet: 1) query param (?tenant=org) 2) auth token fallback
    if (path.startsWith('/members/functions') || path.startsWith('/members/skills')) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[TENANT-MIDDLEWARE] Members filter ruta - detekcija tenanta (query→token): ${path}`);
      }

      // 1) Pokušaj preko query parametra (u skladu s ostatkom aplikacije)
      const tenantFromQuery = (req.query.tenant as string | undefined) ?? (req.query.branding as string | undefined);
      if (tenantFromQuery) {
        const tenantContext = await getOrganizationBySubdomain(tenantFromQuery);
        if (tenantContext) {
          req.organizationId = tenantContext.organizationId;
          req.organization = tenantContext.organization;
          if (process.env.NODE_ENV === 'development') {
            console.log(`[TENANT-MIDDLEWARE] Members filter: tenant set from query: ${tenantFromQuery} -> ID: ${tenantContext.organizationId}`);
          }
          return next();
        }
        // Ako query param postoji, ali organizacija nije pronađena → 404
        console.error(`[TENANT-MIDDLEWARE] Tenant nije pronađen za query parametar: ${tenantFromQuery}`);
        res.status(404).json({
          code: 'ORGANIZATION_NOT_FOUND',
          message: 'Organizacija nije pronađena ili nije aktivna'
        });
        return;
      }

      // 2) Fallback: tenant iz auth tokena
      try {
        const authHeader = req.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as JwtPayload;

          if (decoded.organizationId) {
            req.organizationId = decoded.organizationId;
            // Ne postavljamo req.organization jer JWT payload nema sve potrebne atribute
            return next();
          }
        }
        throw new Error('Nema valjanog auth tokena s organizationId');
      } catch (error) {
        console.error(`[TENANT-MIDDLEWARE] Greška pri dohvaćanju tenant iz auth tokena:`, error);
        res.status(401).json({
          code: 'UNAUTHORIZED',
          message: 'Potreban je valjani auth token za pristup ovim rutama'
        });
        return;
      }
    }
    
    // SIGURNOSNI GUARD: ako smo već postavili tenant za napredne filtere, ne nastavljaj na globalnu detekciju
    if ((path.startsWith('/members/functions') || path.startsWith('/members/skills')) && req.organizationId) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[TENANT-MIDDLEWARE] Guard: tenant već postavljen (ID: ${req.organizationId}) za ${path} → skip global`);
      }
      return next();
    }

    // Organization SM API pozivi se identificiraju kroz path
    // Frontend šalje: /:orgSlug/api/system-manager/*
    // Backend prima: /api/system-manager/* (nakon rewrite-a)
    // Tenant se ekstraktuje iz URL-a prije rewrite-a

    // PRIORITET DETEKCIJE TENANTA:
    // 1. Query parameter (?tenant=promina) - development override
    // 2. URL Path (/promina/api/...) - path-based routing
    // 3. Subdomain (promina.managemembers.com) - legacy/fallback
    
    const tenantQuery = (req.query.tenant as string | undefined) ?? (req.query.branding as string | undefined);
    const pathSlug = extractOrgSlugFromPath(path);
    const subdomain = extractSubdomain(host);
    
    // Koristi prvi dostupni tenant identifier
    const orgSlug = tenantQuery ?? pathSlug ?? subdomain;

    if (process.env.NODE_ENV === 'development') {
      console.log(`[TENANT-MIDDLEWARE] Host: ${host}, Path: ${path}, Final Org Slug: ${orgSlug} (Query: ${tenantQuery}, Path: ${pathSlug}, Subdomain: ${subdomain})`);
    }

    let tenantContext: TenantContext | null = null;

    // Obavezno: mora postojati eksplicitni tenant (query, path ili subdomain)
    if (!orgSlug) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Organization slug is required. Use format: /orgSlug/api/... or ?tenant=orgSlug'
      });
      return;
    }

    // Pokušaj dohvatiti organizaciju po slug-u (koji može biti iz path-a, query-ja ili subdomene)
    tenantContext = await getOrganizationBySubdomain(orgSlug);

    if (!tenantContext) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[TENANT-MIDDLEWARE] Organizacija nije pronađena ili nije aktivna');
      }
      res.status(404).json({
        error: 'Not Found',
        message: 'Organization not found'
      });
      return;
    }

    // Postavi tenant context u request
    req.organizationId = tenantContext.organizationId;
    req.organization = tenantContext.organization;

    if (process.env.NODE_ENV === 'development') {
      console.log(`[TENANT-MIDDLEWARE] Organizacija: ${tenantContext.organization.name} (ID: ${tenantContext.organizationId})`);
    }

    next();
  } catch (error) {
    console.error('[TENANT-MIDDLEWARE] Neočekivana greška:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Greška u tenant middleware'
    });
  }
}

/**
 * Middleware za provjeru da je tenant context postavljen
 * Koristi se za zaštićene rute koje zahtijevaju organizaciju
 */
export function requireTenant(
  req: Request, 
  res: Response, 
  next: NextFunction
): void {
  if (!req.organizationId || !req.organization) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Tenant context nije postavljen'
    });
    return;
  }

  next();
}

/**
 * Utility funkcija za dobivanje organization_id iz request-a
 * Koristi se u repository-jima i servisima
 */
export function getOrganizationId(req: Request): number {
  if (!req.organizationId) {
    throw new Error('Organization ID nije dostupan u request context-u');
  }
  return req.organizationId;
}

/**
 * Utility funkcija za dobivanje organizacije iz request-a
 */
export function getOrganization(req: Request): TenantContext['organization'] {
  if (!req.organization) {
    throw new Error('Organization nije dostupna u request context-u');
  }
  return req.organization;
}

/**
 * Čisti cache organizacija (korisno za testiranje)
 */
export function clearOrganizationCache(): void {
  organizationCache.clear();
}

/**
 * OPTIONAL TENANT MIDDLEWARE
 * 
 * Postavlja tenant context AKO postoji ?tenant= query param,
 * ali NE baca grešku ako tenant nije proslijeđen.
 * 
 * Korisno za rute koje mogu raditi i za Global i za Org context.
 */
export async function optionalTenantMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const host = req.get('host') || req.headers.host as string;
    const _path = req.path;
    
    // Za System Manager rute, org slug MORA biti iz query parametra ili subdomene
    // Path-based parsing preskačemo jer će inače izvući dio rute kao org slug
    const tenantQuery = (req.query.tenant as string | undefined) ?? (req.query.branding as string | undefined);
    const subdomain = extractSubdomain(host);
    
    // NE koristimo pathSlug za System Manager rute
    const orgSlug = tenantQuery ?? subdomain;
    
    if (!orgSlug) {
      // Nema org slug-a - to je OK, nastavi bez tenant context-a
      console.log('[OPTIONAL-TENANT-MIDDLEWARE] No org slug - continuing without tenant context');
      next();
      return;
    }
    
    // Ima org slug - dohvati organizaciju
    const tenantContext = await getOrganizationBySubdomain(orgSlug);
    
    if (tenantContext) {
      // Postavi tenant context
      req.organizationId = tenantContext.organizationId;
      req.organization = tenantContext.organization;
      console.log(`[OPTIONAL-TENANT-MIDDLEWARE] Tenant set: ${tenantContext.organization.name} (ID: ${tenantContext.organizationId})`);
    } else {
      console.warn(`[OPTIONAL-TENANT-MIDDLEWARE] Org not found for slug: ${orgSlug} - continuing without tenant`);
    }
    
    // Nastavi dalje (čak i ako org nije pronađena)
    next();
  } catch (error) {
    // Ne baci grešku - samo loggiraj i nastavi
    console.warn('[OPTIONAL-TENANT-MIDDLEWARE] Error:', error);
    next();
  }
}
