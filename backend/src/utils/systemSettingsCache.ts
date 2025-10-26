/**
 * Cache mehanizam za system settings
 * Sprječava višestruke DB upite za rijetko mijenjane podatke
 */

import prisma from './prisma.js';

interface CachedSettings {
  activityHoursThreshold: number;
  organizationId: number | null;
  cachedAt: number;
}

// Cache storage - u produkciji bi ovo moglo biti Redis
const settingsCache = new Map<string, CachedSettings>();

// Cache TTL - 5 minuta (300000ms)
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Generiše cache key za organizaciju
 */
function getCacheKey(organizationId?: number | null): string {
  return `settings:${organizationId ?? 'global'}`;
}

/**
 * Provjerava je li cache valjan
 */
function isCacheValid(cached: CachedSettings): boolean {
  return Date.now() - cached.cachedAt < CACHE_TTL;
}

/**
 * Dohvaća activity hours threshold iz cache-a ili baze
 * @param organizationId - ID organizacije (optional za multi-tenancy)
 * @returns Activity hours threshold (default 20)
 */
export async function getActivityHoursThreshold(organizationId?: number | null): Promise<number> {
  const cacheKey = getCacheKey(organizationId);
  
  // Provjeri cache
  const cached = settingsCache.get(cacheKey);
  if (cached && isCacheValid(cached)) {
    return cached.activityHoursThreshold;
  }
  
  // Dohvati iz baze
  try {
    const settings = await prisma.systemSettings.findFirst({
      where: organizationId ? { organization_id: organizationId } : {},
      select: { 
        activityHoursThreshold: true,
        organization_id: true
      }
    });
    
    const threshold = settings?.activityHoursThreshold ?? 20;
    
    // Spremi u cache
    settingsCache.set(cacheKey, {
      activityHoursThreshold: threshold,
      organizationId: settings?.organization_id ?? null,
      cachedAt: Date.now()
    });
    
    return threshold;
  } catch (error) {
    console.error('[SYSTEM_SETTINGS_CACHE] Error fetching threshold:', error);
    return 20; // Fallback na default vrijednost
  }
}

/**
 * Invalidira cache za određenu organizaciju
 * Poziva se nakon update-a system settings
 */
export function invalidateSettingsCache(organizationId?: number | null): void {
  const cacheKey = getCacheKey(organizationId);
  settingsCache.delete(cacheKey);
  console.log(`[SYSTEM_SETTINGS_CACHE] Invalidated cache for ${cacheKey}`);
}

/**
 * Čisti cijeli cache
 * Koristi se za maintenance ili testing
 */
export function clearAllSettingsCache(): void {
  settingsCache.clear();
  console.log('[SYSTEM_SETTINGS_CACHE] Cleared all cache');
}
