/**
 * Helper funkcije za određivanje activity status-a člana
 */

/**
 * Pretvara minute u sate
 */
export const minutesToHours = (minutes: number): number => {
  return minutes / 60;
};

/**
 * Pretvara sate u minute
 */
export const hoursToMinutes = (hours: number): number => {
  return hours * 60;
};

/**
 * Provjerava je li član aktivan na temelju activity hours i threshold-a
 * @param activityMinutes - Broj minuta aktivnosti (activity_hours iz baze)
 * @param thresholdHours - Prag sati za aktivan status (default 20)
 * @returns true ako je član aktivan, false ako je pasivan
 */
export const isActiveMember = (activityMinutes: number | null | undefined, thresholdHours = 20): boolean => {
  const minutes = Number(activityMinutes ?? 0);
  const hours = minutesToHours(minutes);
  return hours >= thresholdHours;
};

/**
 * Vraća activity status string ('active' ili 'passive')
 * @param activityMinutes - Broj minuta aktivnosti (activity_hours iz baze)
 * @param thresholdHours - Prag sati za aktivan status (default 20)
 * @returns 'active' ili 'passive'
 */
export const getActivityStatus = (activityMinutes: number | null | undefined, thresholdHours = 20): 'active' | 'passive' => {
  return isActiveMember(activityMinutes, thresholdHours) ? 'active' : 'passive';
};
