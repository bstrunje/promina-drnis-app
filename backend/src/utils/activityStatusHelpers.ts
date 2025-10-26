/**
 * Helper funkcije za određivanje activity status-a člana
 */

import { getActivityHoursThreshold as getCachedThreshold } from './systemSettingsCache.js';

/**
 * Dohvaća activity hours threshold iz cache-a ili system settings
 * @param organizationId - ID organizacije (optional za multi-tenancy)
 * @returns Activity hours threshold (default 20)
 */
export async function getActivityHoursThreshold(organizationId?: number | null): Promise<number> {
  return getCachedThreshold(organizationId);
}

/**
 * Određuje activity status na temelju activity hours i threshold-a
 * @param activityHours - Broj sati aktivnosti
 * @param threshold - Prag sati za aktivan status (default 20)
 * @returns 'active' ili 'passive'
 */
export function determineActivityStatus(
  activityHours: number | null | undefined,
  threshold: number = 20
): 'active' | 'passive' {
  const hours = typeof activityHours === 'string' 
    ? parseFloat(activityHours) 
    : Number(activityHours ?? 0);
    
  return hours >= threshold ? 'active' : 'passive';
}
