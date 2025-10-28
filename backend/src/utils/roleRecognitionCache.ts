// utils/roleRecognitionCache.ts
// Cache za role recognition percentages da izbjegnemo česte upite u bazu

import prisma from './prisma.js';

interface RoleRecognitionSettings {
  GUIDE: number;
  ASSISTANT_GUIDE: number;
  DRIVER: number;
  REGULAR: number;
}

interface CachedRoleRecognition {
  settings: RoleRecognitionSettings;
  organizationId: number | null;
  cachedAt: number;
}

// Default vrijednosti ako nisu postavljene u bazi
const DEFAULT_ROLE_RECOGNITION: RoleRecognitionSettings = {
  GUIDE: 100,
  ASSISTANT_GUIDE: 50,
  DRIVER: 100,
  REGULAR: 10
};

// Cache storage
const roleRecognitionCache = new Map<string, CachedRoleRecognition>();

// Cache validity period (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

function isCacheValid(cached: CachedRoleRecognition): boolean {
  return Date.now() - cached.cachedAt < CACHE_TTL;
}

/**
 * Dohvaća role recognition percentages za organizaciju
 * Koristi cache za performanse
 */
export async function getRoleRecognitionSettings(organizationId: number | null): Promise<RoleRecognitionSettings> {
  const cacheKey = `org_${organizationId ?? 'global'}`;
  
  // Provjeri cache
  const cached = roleRecognitionCache.get(cacheKey);
  if (cached && isCacheValid(cached)) {
    return cached.settings;
  }
  
  // Dohvati iz baze
  try {
    const settings = await prisma.systemSettings.findFirst({
      where: organizationId ? { organization_id: organizationId } : {},
      select: { 
        activityRoleRecognition: true,
        organization_id: true
      }
    });
    
    let roleSettings: RoleRecognitionSettings;
    
    if (settings?.activityRoleRecognition && typeof settings.activityRoleRecognition === 'object') {
      // Prisma vraća JSON kao object, konvertiraj u RoleRecognitionSettings
      const dbSettings = settings.activityRoleRecognition as Record<string, unknown>;
      roleSettings = {
        GUIDE: typeof dbSettings.GUIDE === 'number' ? dbSettings.GUIDE : DEFAULT_ROLE_RECOGNITION.GUIDE,
        ASSISTANT_GUIDE: typeof dbSettings.ASSISTANT_GUIDE === 'number' ? dbSettings.ASSISTANT_GUIDE : DEFAULT_ROLE_RECOGNITION.ASSISTANT_GUIDE,
        DRIVER: typeof dbSettings.DRIVER === 'number' ? dbSettings.DRIVER : DEFAULT_ROLE_RECOGNITION.DRIVER,
        REGULAR: typeof dbSettings.REGULAR === 'number' ? dbSettings.REGULAR : DEFAULT_ROLE_RECOGNITION.REGULAR,
      };
    } else {
      // Koristi default ako nema u bazi
      roleSettings = DEFAULT_ROLE_RECOGNITION;
    }
    
    // Spremi u cache
    roleRecognitionCache.set(cacheKey, {
      settings: roleSettings,
      organizationId: settings?.organization_id ?? null,
      cachedAt: Date.now()
    });
    
    return roleSettings;
  } catch (error) {
    console.error('[ROLE-RECOGNITION] Error fetching settings:', error);
    // U slučaju greške, vrati default
    return DEFAULT_ROLE_RECOGNITION;
  }
}

/**
 * Invalidira cache za određenu organizaciju
 * Poziva se nakon update-a settings
 */
export function invalidateRoleRecognitionCache(organizationId: number | null): void {
  const cacheKey = `org_${organizationId ?? 'global'}`;
  roleRecognitionCache.delete(cacheKey);
}

/**
 * Dohvaća postotak priznavanja za određenu ulogu
 */
export function getRoleRecognitionPercentage(
  roleSettings: RoleRecognitionSettings,
  role: string | null | undefined
): number {
  if (!role) return roleSettings.REGULAR; // Default za null/undefined
  
  const upperRole = role.toUpperCase();
  
  switch (upperRole) {
    case 'GUIDE':
      return roleSettings.GUIDE;
    case 'ASSISTANT_GUIDE':
      return roleSettings.ASSISTANT_GUIDE;
    case 'DRIVER':
      return roleSettings.DRIVER;
    case 'REGULAR':
    default:
      return roleSettings.REGULAR;
  }
}
