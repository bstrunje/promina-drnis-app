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

/**
 * Fallback organizacija za development
 * Ako nema subdomene, koristi PD Promina kao default
 */
async function getDefaultOrganization(): Promise<TenantContext | null> {
  const DEFAULT_SUBDOMAIN = 'promina';
  
  return await getOrganizationBySubdomain(DEFAULT_SUBDOMAIN);
}

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
    const subdomain = extractSubdomain(host);

    console.log(`[TENANT-MIDDLEWARE] Host: ${host}, Subdomain: ${subdomain}`);

    let tenantContext: TenantContext | null = null;

    if (subdomain) {
      // Pokušaj dohvatiti organizaciju po subdomeni
      tenantContext = await getOrganizationBySubdomain(subdomain);
    }

    if (!tenantContext) {
      // Fallback na default organizaciju (PD Promina)
      tenantContext = await getDefaultOrganization();
    }

    if (!tenantContext) {
      console.error('[TENANT-MIDDLEWARE] Nema dostupnih organizacija!');
      res.status(503).json({
        error: 'Service Unavailable',
        message: 'Organizacija nije dostupna'
      });
      return;
    }

    // Postavi tenant context u request
    req.organizationId = tenantContext.organizationId;
    req.organization = tenantContext.organization;

    console.log(`[TENANT-MIDDLEWARE] Organizacija: ${tenantContext.organization.name} (ID: ${tenantContext.organizationId})`);

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
