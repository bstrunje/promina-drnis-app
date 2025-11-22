/**
 * TENANT UTILITIES
 * 
 * Utility funkcije za rad s multi-tenant funkcionalnostima
 * Detekcija tenant-a, URL manipulacija, environment handling
 */

/**
 * Izvlači org slug iz URL path-a (path-based multi-tenancy)
 * Primjeri:
 * - /promina/dashboard → 'promina'
 * - /split/members → 'split'
 * - /system-manager/login → null (izuzeće)
 */
export const extractOrgSlugFromPath = (): string | null => {
  const pathname = window.location.pathname;
  
  if (!pathname || pathname === '/') return null;
  
  // Ukloni leading slash
  const cleanPath = pathname.startsWith('/') ? pathname.substring(1) : pathname;
  
  // Split po slash
  const parts = cleanPath.split('/');
  
  if (parts.length === 0) return null;
  
  const orgSlug = parts[0];
  
  // Izuzeci - samo infrastrukturne rute koje nisu org slugovi
  // SVE ostale rute MORAJU biti pod organizacijom (/{orgSlug}/...)
  const excludedPrefixes = [
    'api',           // Backend API pozivi
    'uploads',       // Statički resursi
    'health',        // Health check endpoint
    'system-manager' // Globalni System Manager (jedinstvena iznimka)
  ];
  if (excludedPrefixes.includes(orgSlug)) {
    return null;
  }
  
  // Osnovni format check
  const validSlugRegex = /^[a-z0-9-]+$/;
  if (!validSlugRegex.test(orgSlug)) {
    return null;
  }
  
  return orgSlug;
};

/**
 * Detektira trenutni tenant iz URL-a ili localStorage cache-a
 * PRIORITET:
 * 1. URL Path (/promina/...) - path-based routing
 * 2. Query parameter (?tenant=promina) - development override
 * 3. Subdomain (promina.managemembers.com) - legacy fallback
 * 4. localStorage cache
 * 
 * Baca grešku ako tenant nije pronađen - korisnika treba preusmjeriti na login
 */
export const getCurrentTenant = (): string => {
  // 1. Pokušaj iz URL path-a (prioritet!)
  const pathSlug = extractOrgSlugFromPath();
  if (pathSlug) {
    setCachedTenant(pathSlug); // Cache za buduće korištenje
    return pathSlug;
  }
  
  // 2. Provjeri query parameter (development override)
  const urlParams = new URLSearchParams(window.location.search);
  const tenantParam = urlParams.get('tenant') ?? urlParams.get('branding');
  if (tenantParam) {
    setCachedTenant(tenantParam);
    return tenantParam;
  }
  
  // 3. Pokušaj iz subdomene (legacy/fallback)
  const hostname = window.location.hostname;
  if (!hostname.includes('localhost') && !hostname.includes('127.0.0.1')) {
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      const subdomain = parts[0];
      setCachedTenant(subdomain);
      return subdomain;
    }
  }
  
  // 4. Pokušaj iz localStorage cache-a
  const cached = getCachedTenant();
  if (cached) {
    return cached;
  }
  
  // NEMA fallback-a - korisnik mora odabrati tenant
  if (import.meta.env.DEV) console.warn('[TENANT] Tenant nije specificiran - potrebna prijava');
  throw new Error('Tenant is required. Please login again.');
};

/**
 * Provjera je li trenutno development okruženje
 */
export const isDevelopment = (): boolean => {
  const hostname = window.location.hostname;
  return hostname.includes('localhost') || hostname.includes('127.0.0.1');
};

/**
 * Provjera je li trenutno production okruženje
 */
export const isProduction = (): boolean => {
  return !isDevelopment();
};

/**
 * Generiraj URL za određeni tenant
 */
export const getTenantUrl = (tenant: string, path = ''): string => {
  if (isDevelopment()) {
    // Development - koristi query parameter
    const baseUrl = `${window.location.protocol}//${window.location.host}`;
    const separator = path.includes('?') ? '&' : '?';
    return `${baseUrl}${path}${separator}tenant=${tenant}`;
  }
  
  // Production - koristi subdomenu
  const protocol = window.location.protocol;
  const domain = window.location.hostname.split('.').slice(1).join('.'); // Ukloni subdomenu
  return `${protocol}//${tenant}.${domain}${path}`;
};

/**
 * Generiraj API base URL za trenutni tenant
 */
export const getApiBaseUrl = (): string => {
  if (isDevelopment()) {
    // Development - koristi dinamičku konfiguraciju kao i config.ts
    // Podržava VITE_BACKEND_PORT environment varijablu
    const envPort = (import.meta as { env: Record<string, unknown> }).env.VITE_BACKEND_PORT;
    const backendPort = typeof envPort === 'string' && envPort.length > 0 ? envPort : '3000';

    return `http://localhost:${backendPort}/api`;
  }

  // Production - API ide preko zasebne domene na Hetzneru
  return 'https://api.managemembers.org/api';
};

/**
 * Provjeri je li tenant valjan (osnovni format check)
 */
export const isValidTenant = (tenant: string): boolean => {
  // Osnovne provjere
  if (!tenant || tenant.length === 0) return false;
  if (tenant.length > 50) return false;
  
  // Regex za validne karaktere (slova, brojevi, crtice)
  const validTenantRegex = /^[a-z0-9-]+$/;
  return validTenantRegex.test(tenant);
};

/**
 * Normaliziraj tenant naziv (lowercase, ukloni specijalne znakove)
 */
export const normalizeTenant = (tenant: string): string => {
  return tenant
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-') // Zamijeni specijalne znakove s crticama
    .replace(/-+/g, '-') // Ukloni višestruke crtice
    .replace(/^-|-$/g, ''); // Ukloni crtice na početku/kraju
};

/**
 * Dohvati tenant iz localStorage (backup metoda)
 */
export const getCachedTenant = (): string | null => {
  try {
    return localStorage.getItem('current_tenant');
  } catch {
    return null;
  }
};

/**
 * Spremi tenant u localStorage
 */
export const setCachedTenant = (tenant: string): void => {
  try {
    localStorage.setItem('current_tenant', tenant);
  } catch (error) {
    if (import.meta.env.DEV) console.warn('Ne mogu spremiti tenant u localStorage:', error);
  }
};

/**
 * Ukloni cached tenant
 */
export const clearCachedTenant = (): void => {
  try {
    localStorage.removeItem('current_tenant');
  } catch (error) {
    if (import.meta.env.DEV) console.warn('Ne mogu ukloniti tenant iz localStorage:', error);
  }
};

/**
 * Redirect na određeni tenant
 */
export const redirectToTenant = (tenant: string, path = ''): void => {
  const url = getTenantUrl(tenant, path);
  window.location.href = url;
};

/**
 * Provjeri je li trenutni URL za određeni tenant
 */
export const isCurrentTenant = (tenant: string): boolean => {
  return getCurrentTenant() === tenant;
};

/**
 * Lista poznatih tenant-a (može se proširiti dinamički)
 */
export const KNOWN_TENANTS = [
  'promina',
  'test',
  'demo'
] as const;

export type KnownTenant = typeof KNOWN_TENANTS[number];

/**
 * Provjeri je li tenant u listi poznatih
 */
export const isKnownTenant = (tenant: string): tenant is KnownTenant => {
  return KNOWN_TENANTS.includes(tenant as KnownTenant);
};

/**
 * Debug informacije o trenutnom tenant-u
 */
export const getTenantDebugInfo = () => {
  const tenant = getCurrentTenant();
  return {
    tenant,
    hostname: window.location.hostname,
    isDevelopment: isDevelopment(),
    isProduction: isProduction(),
    apiBaseUrl: getApiBaseUrl(),
    isValid: isValidTenant(tenant),
    isKnown: isKnownTenant(tenant),
    cached: getCachedTenant(),
  };
};

/**
 * Generiraj org-aware path za navigaciju
 * VAŽNO: SVE aplikacijske rute MORAJU koristiti ovu funkciju!
 * 
 * @example
 * getOrgPath('/activities') → '/promina/activities'
 * getOrgPath('/members/123') → '/promina/members/123'
 * getOrgPath('activities') → '/promina/activities' (automatski dodaje leading slash)
 */
export const getOrgPath = (path: string): string => {
  const tenant = getCurrentTenant();
  
  // Ukloni leading slash ako postoji
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  
  // Provjeri da path već ne sadrži org slug
  if (cleanPath.startsWith(`${tenant}/`)) {
    return `/${cleanPath}`;
  }
  
  return `/${tenant}/${cleanPath}`;
};

export default {
  getCurrentTenant,
  isDevelopment,
  isProduction,
  getTenantUrl,
  getApiBaseUrl,
  isValidTenant,
  normalizeTenant,
  getCachedTenant,
  setCachedTenant,
  clearCachedTenant,
  redirectToTenant,
  isCurrentTenant,
  isKnownTenant,
  getTenantDebugInfo,
  getOrgPath,
  KNOWN_TENANTS,
};
