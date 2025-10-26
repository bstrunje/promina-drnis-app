/**
 * Nager.Date API Service
 * Besplatni API za dohvaćanje praznika za 100+ zemalja
 * API dokumentacija: https://date.nager.at/Api
 */

export interface NagerDateHoliday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  counties: string[] | null;
  launchYear: number | null;
  types: string[];
}

export interface NagerCountry {
  countryCode: string;
  name: string;
}

const NAGER_API_BASE = 'https://date.nager.at/api/v3';

/**
 * Dohvaća sve podržane države iz Nager.Date API-ja
 */
export async function getAvailableCountries(): Promise<NagerCountry[]> {
  try {
    const response = await fetch(`${NAGER_API_BASE}/AvailableCountries`);
    if (!response.ok) {
      throw new Error(`Nager.Date API error: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('[NAGER-DATE] Error fetching available countries:', error);
    throw error;
  }
}

/**
 * Dohvaća praznike za određenu državu i godinu
 * @param year - Godina (npr. 2025)
 * @param countryCode - ISO 3166-1 alpha-2 kod (npr. 'HR', 'BA', 'ME')
 */
export async function getPublicHolidays(year: number, countryCode: string): Promise<NagerDateHoliday[]> {
  try {
    const response = await fetch(`${NAGER_API_BASE}/PublicHolidays/${year}/${countryCode.toUpperCase()}`);
    if (!response.ok) {
      throw new Error(`Nager.Date API error: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`[NAGER-DATE] Error fetching holidays for ${countryCode} ${year}:`, error);
    throw error;
  }
}

/**
 * Provjerava je li određeni datum praznik
 * @param date - Datum u formatu YYYY-MM-DD
 * @param countryCode - ISO 3166-1 alpha-2 kod
 */
export async function isPublicHoliday(date: string, countryCode: string): Promise<boolean> {
  try {
    const [year, month, day] = date.split('-');
    const response = await fetch(
      `${NAGER_API_BASE}/IsTodayPublicHoliday/${countryCode.toUpperCase()}?date=${year}-${month}-${day}`
    );
    return response.status === 200;
  } catch (error) {
    console.error(`[NAGER-DATE] Error checking if ${date} is holiday:`, error);
    return false;
  }
}

/**
 * Dohvaća sljedeći praznik za određenu državu
 * @param countryCode - ISO 3166-1 alpha-2 kod
 */
export async function getNextPublicHolidays(countryCode: string): Promise<NagerDateHoliday[]> {
  try {
    const response = await fetch(`${NAGER_API_BASE}/NextPublicHolidays/${countryCode.toUpperCase()}`);
    if (!response.ok) {
      throw new Error(`Nager.Date API error: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`[NAGER-DATE] Error fetching next holidays for ${countryCode}:`, error);
    throw error;
  }
}

/**
 * Konvertira Nager.Date praznik u format aplikacije
 */
export function convertNagerHolidayToAppFormat(nagerHoliday: NagerDateHoliday) {
  return {
    date: nagerHoliday.date,
    name: nagerHoliday.localName || nagerHoliday.name,
    is_recurring: nagerHoliday.fixed || nagerHoliday.global
  };
}
