/**
 * TENANT UTILITIES
 * 
 * Utility funkcije za rad s multi-tenant funkcionalnostima
 * Detekcija tenant-a, URL manipulacija, environment handling
 */

/**
 * Detektira trenutni tenant iz URL-a ili localStorage cache-a
 * Baca grešku ako tenant nije pronađen - korisnika treba preusmjeriti na login
 */
export const getCurrentTenant = (): string => {
  const hostname = window.location.hostname;
  
  // Development okruženje
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    // Provjeri query parameter za testiranje (podržava 'tenant' i 'branding')
    const urlParams = new URLSearchParams(window.location.search);
    const tenantParam = urlParams.get('tenant') ?? urlParams.get('branding');
    if (tenantParam) {
      // Spremi u cache za kasnije korištenje
      setCachedTenant(tenantParam);
      return tenantParam;
    }
    
    // Pokušaj iz cache-a
    const cached = getCachedTenant();
    if (cached) {
      return cached;
    }
    
    // NEMA fallback-a - korisnik mora odabrati tenant
    console.warn('[TENANT] Tenant nije specificiran - potrebna prijava');
    throw new Error('Tenant is required. Please login again.');
  }
  
  // Production okruženje - subdomena
  const parts = hostname.split('.');
  if (parts.length >= 2) {
    return parts[0];
  }
  
  // NEMA fallback-a
  console.warn('[TENANT] Ne mogu detektirati tenant iz URL-a');
  throw new Error('Unable to detect tenant from URL');
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

  // Production - isti domain kao frontend s /api prefiksom
  return `${window.location.origin}/api`;
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
    console.warn('Ne mogu spremiti tenant u localStorage:', error);
  }
};

/**
 * Ukloni cached tenant
 */
export const clearCachedTenant = (): void => {
  try {
    localStorage.removeItem('current_tenant');
  } catch (error) {
    console.warn('Ne mogu ukloniti tenant iz localStorage:', error);
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
  KNOWN_TENANTS,
};
