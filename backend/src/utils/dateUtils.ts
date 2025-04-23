/**
 * Pomoćne funkcije za rad s datumima
 * Ova verzija se koristi na backendu i trebala bi biti kompatibilna s frontend verzijom
 */

let mockDate: Date | null = null;

/**
 * Vraća trenutni datum, uzimajući u obzir i moguću simulaciju datuma
 * @returns Trenutni datum ili simulirani datum ako je postavljen
 */
export function getCurrentDate(): Date {
  return mockDate || new Date();
}

/**
 * Postavlja simulirani datum za testiranje
 * @param date Datum koji želimo simulirati
 */
export function setMockDate(date: Date): void {
  mockDate = date;
  console.log(`📅 Mock datum postavljen na: ${date.toISOString()}`);
}

/**
 * Resetira simulirani datum na null, tako da getCurrentDate() vraća stvarni sistemski datum
 */
export function resetMockDate(): void {
  mockDate = null;
  console.log('📅 Mock datum resetiran, koristi se stvarni datum');
}

/**
 * Vraća trenutnu godinu (iz stvarnog ili simuliranog datuma)
 * @returns broj koji predstavlja godinu
 */
export function getCurrentYear(): number {
  return getCurrentDate().getFullYear();
}

/**
 * Provjerava je li datum u trenutnoj godini
 * @param date Datum koji provjeravamo
 * @returns true ako je datum u trenutnoj godini, inače false
 */
export function isDateInCurrentYear(date: Date): boolean {
  const currentYear = getCurrentYear();
  const yearOfDate = date.getFullYear();
  return currentYear === yearOfDate;
}

export default {
  getCurrentDate,
  setMockDate,
  resetMockDate,
  getCurrentYear,
  isDateInCurrentYear
};
