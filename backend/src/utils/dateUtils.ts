/**
 * Pomoćne funkcije za rad s datumima
 * Ova verzija se koristi na backendu i trebala bi biti kompatibilna s frontend verzijom
 */

let mockDate: Date | null = null;
let systemTimeZone: string = 'Europe/Zagreb'; // Zadana vremenska zona
const isDev = process.env.NODE_ENV === 'development';

/**
 * Postavlja vremensku zonu sustava
 * @param timeZone Identifikator vremenske zone (npr. 'Europe/Zagreb')
 */
export function setSystemTimeZone(timeZone: string): void {
  systemTimeZone = timeZone;
  if (isDev) console.log(`🌐 Vremenska zona sustava postavljena na: ${timeZone}`);
}

/**
 * Vraća trenutno postavljenu vremensku zonu sustava
 * @returns Trenutna vremenska zona sustava
 */
export function getSystemTimeZone(): string {
  return systemTimeZone;
}

/**
 * Vraća trenutni datum, uzimajući u obzir i moguću simulaciju datuma
 * @returns Trenutni datum ili simulirani datum ako je postavljen
 */
export function getCurrentDate(): Date {
  return mockDate || new Date();
}

/**
 * Vraća trenutni datum i vrijeme u UTC formatu
 * Ovo treba koristiti za sve operacije vezane za tokene i bazu podataka
 * @returns Trenutni UTC datum
 */
export function getCurrentUTCDate(): Date {
  const now = getCurrentDate();
  return new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds(),
    now.getUTCMilliseconds()
  ));
}

/**
 * Dodaje određeni broj dana na datum
 * @param date Polazni datum
 * @param days Broj dana za dodati
 * @returns Novi datum s dodanim danima
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Dodaje određeni broj sekundi na datum
 * @param date Polazni datum
 * @param seconds Broj sekundi za dodati
 * @returns Novi datum s dodanim sekundama
 */
export function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}

/**
 * Generira datum isteka tokena u UTC formatu
 * @param durationDays Trajanje tokena u danima
 * @returns Datum isteka tokena u UTC formatu
 */
export function getTokenExpiryDate(durationDays: number): Date {
  // Koristimo UTC format za dosljednost
  const now = getCurrentUTCDate();
  return addDays(now, durationDays);
}

/**
 * Postavlja simulirani datum za testiranje
 * @param date Datum koji želimo simulirati
 */
export function setMockDate(date: Date): void {
  mockDate = date;
  if (isDev) console.log(`📅 Mock datum postavljen na: ${formatDate(date, 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'')}`);  
}

/**
 * Resetira simulirani datum na null, tako da getCurrentDate() vraća stvarni sistemski datum
 */
export function resetMockDate(): void {
  mockDate = null;
  if (isDev) console.log('📅 Mock datum resetiran, koristi se stvarni datum');
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
  const result = format
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
 * Formatira datum u ISO string (UTC format)
 * @param date Datum koji želimo formatirati
 * @returns ISO string u UTC formatu
 */
export function formatUTCDate(date: Date): string {
  return formatDate(date, 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'');
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

/**
 * Uspoređuje dva datuma i vraća rezultat usporedbe
 * @param date1 Prvi datum za usporedbu
 * @param date2 Drugi datum za usporedbu
 * @returns -1 ako je date1 < date2, 0 ako su jednaki, 1 ako je date1 > date2
 */
export function compareDates(date1: Date, date2: Date): number {
  const time1 = date1.getTime();
  const time2 = date2.getTime();
  
  if (time1 < time2) return -1;
  if (time1 > time2) return 1;
  return 0;
}

/**
 * Provjerava je li datum1 prije datuma2
 * @param date1 Prvi datum
 * @param date2 Drugi datum
 * @returns true ako je date1 prije date2
 */
export function isDateBefore(date1: Date, date2: Date): boolean {
  return compareDates(date1, date2) < 0;
}

/**
 * Provjerava je li datum istekao (prije trenutnog datuma)
 * @param date Datum koji provjeravamo
 * @returns true ako je datum istekao
 */
export function isDateExpired(date: Date): boolean {
  return isDateBefore(date, getCurrentUTCDate());
}

/**
 * Čisti ISO string od dodatnih navodnika
 * @param dateStr ISO string koji može sadržavati dodatne navodnike
 * @returns Očišćeni ISO string bez dodatnih navodnika
 */
export function cleanISODateString(dateStr: string): string {
  if (!dateStr) return '';
  
  // Ukloni sve dodatne navodnike oko T i Z
  return dateStr.replace(/'/g, '');
}

export default {
  getCurrentDate,
  getCurrentUTCDate,
  setSystemTimeZone,
  cleanISODateString,
  getSystemTimeZone,
  addDays,
  addSeconds,
  getTokenExpiryDate,
  setMockDate,
  resetMockDate,
  isMockDateActive,
  getCurrentYear,
  isDateInCurrentYear,
  formatDate,
  formatUTCDate,
  parseDate,
  compareDates,
  isDateBefore,
  isDateExpired
};
