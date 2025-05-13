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
  console.log(`📅 Mock datum postavljen na: ${formatDate(date, 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'')}`);
}

/**
 * Resetira simulirani datum na null, tako da getCurrentDate() vraća stvarni sistemski datum
 */
export function resetMockDate(): void {
  mockDate = null;
  console.log('📅 Mock datum resetiran, koristi se stvarni datum');
}

/**
 * Provjerava je li Mock datum postavljen na današnji datum
 * @returns true ako je Mock datum postavljen na današnji datum, inače false
 */
export function isMockDateActive(): boolean {
  // Ako Mock datum nije postavljen, nije aktivan
  if (mockDate === null) {
    return false;
  }
  
  // Dohvati stvarni sistemski datum
  const systemDate = new Date();
  
  // Usporedi samo datum (dan, mjesec, godina) bez vremena
  const mockDateStr = formatDate(mockDate, 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'').split('T')[0];
  const systemDateStr = formatDate(systemDate, 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'').split('T')[0];
  
  // Mock datum je aktivan ako je JEDNAK današnjem datumu
  return mockDateStr === systemDateStr;
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

/**
 * Formatira datum prema zadanom formatu
 * @param date Datum koji želimo formatirati
 * @param format Format datuma (npr. 'yyyy-MM-dd')
 * @returns Formatirani datum kao string
 */
export function formatDate(date: Date, format: string = 'yyyy-MM-dd'): string {
  if (!date) return '';
  
  // Jednostavna implementacija formatiranja datuma
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
  
  // Zamijeni placeholdere u formatu
  let result = format
    .replace('yyyy', String(year))
    .replace('MM', month)
    .replace('dd', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
    .replace('SSS', milliseconds);
  
  return result;
}

/**
 * Parsira string u Date objekt
 * @param dateStr String koji želimo parsirati u Date
 * @returns Date objekt
 */
export function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  
  // Pokušaj parsirati kao ISO string
  const date = new Date(dateStr);
  
  // Provjeri je li datum validan
  if (isNaN(date.getTime())) {
    console.error(`Nevažeći format datuma: ${dateStr}`);
    return new Date(); // Vrati trenutni datum ako je parsiranje neuspješno
  }
  
  return date;
}

export default {
  getCurrentDate,
  setMockDate,
  resetMockDate,
  isMockDateActive,
  getCurrentYear,
  isDateInCurrentYear,
  formatDate,
  parseDate
};
