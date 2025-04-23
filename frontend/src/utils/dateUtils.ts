/**
 * Utility funkcije za rad s datumima, uključujući mogućnost simulacije datuma za testiranje
 */
import { format, parseISO, isValid, parse } from 'date-fns';
import { hr } from 'date-fns/locale';

// Spremnik za mock datum koji će se koristiti umjesto stvarnog datuma
let mockDate: Date | null = null;

// Spremnik za originalne mock datume prije resetiranja
let originalMockDate: Date | null = null;
let hasOriginalBeenStored: boolean = false;

/**
 * Vraća trenutni datum - ako je postavljen mock datum, vraća njega, inače stvarni datum
 */
export function getCurrentDate(): Date {
  return mockDate || new Date();
}

/**
 * Postavlja mock datum za testiranje
 * @param date - Datum koji će se koristiti umjesto stvarnog
 */
export function setMockDate(date: Date | null): void {
  // Spremi originalnu vrijednost ako još nije spremljena
  if (!hasOriginalBeenStored) {
    originalMockDate = mockDate;
    hasOriginalBeenStored = true;
  }
  mockDate = date;
}

/**
 * Resetira mock datum na null (vraća korištenje stvarnog sistemskog datuma)
 */
export function resetMockDate(): void {
  mockDate = null;
  hasOriginalBeenStored = false;
}

/**
 * Vraća mock datum na prethodnu vrijednost koja je bila prije mockanja
 * @returns true ako je uspješno vraćeno na originalnu vrijednost, false ako nema spremljenog originala
 */
export function restoreOriginalMock(): boolean {
  if (hasOriginalBeenStored) {
    mockDate = originalMockDate;
    hasOriginalBeenStored = false;
    return true;
  }
  return false;
}

/**
 * Vraća trenutnu godinu - bazira se na getCurrentDate()
 */
export function getCurrentYear(): number {
  return getCurrentDate().getFullYear();
}

/**
 * Provjerava je li neki datum unutar tekuće godine
 * @param date - Datum za provjeru
 */
export function isCurrentYear(date: Date): boolean {
  return date.getFullYear() === getCurrentYear();
}

/**
 * Vraća formatiran datum kao string
 * @param date - Datum koji treba formatirati (ili null za trenutni datum)
 * @param dateFormat - Format datuma (default: 'dd.MM.yyyy')
 */
export function formatDate(date: Date | string | null = null, dateFormat: string = 'dd.MM.yyyy'): string {
  if (!date) return '';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return format(d, dateFormat, { locale: hr });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Pretvara datum iz ISO formata u hrvatski format za prikaz u input poljima
 * @param isoDate - ISO datum (YYYY-MM-DD)
 * @returns Date string u formatu DD.MM.YYYY
 */
export function isoToHrFormat(isoDate: string): string {
  if (!isoDate) return '';
  
  try {
    const date = parseISO(isoDate);
    return format(date, 'dd.MM.yyyy', { locale: hr });
  } catch (error) {
    console.error('Error converting ISO to HR format:', error);
    return '';
  }
}

/**
 * Pretvara datum iz hrvatskog formata u ISO format za spremanje u bazu
 * @param hrDate - Hrvatski datum (DD.MM.YYYY)
 * @returns Date string u ISO formatu (YYYY-MM-DD)
 */
export function hrToIsoFormat(hrDate: string): string {
  if (!hrDate) return '';
  
  try {
    // Parse dd.MM.yyyy format to Date object
    const date = parse(hrDate, 'dd.MM.yyyy', new Date());
    
    // Format to ISO date format (YYYY-MM-DD)
    return format(date, 'yyyy-MM-dd');
  } catch (error) {
    console.error('Error converting HR to ISO format:', error);
    return '';
  }
}

/**
 * Formatira input polje date za prikaz u obrascu
 * @param date - Date object ili string
 * @returns Date string u formatu koji koristi input[type="date"] (YYYY-MM-DD)
 */
export function formatInputDate(date: Date | string | null = null): string {
  if (!date) return '';
  
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'yyyy-MM-dd');
  } catch (error) {
    console.error('Error formatting input date:', error);
    return '';
  }
}

/**
 * Parsira datum iz stringa u Date objekt
 * @param dateString - String koji sadrži datum
 * @param dateFormat - Format datuma (default: 'yyyy-MM-dd')
 */
export function parseDate(dateString: string | null, dateFormat: string = 'yyyy-MM-dd'): Date | null {
  if (!dateString) return null;
  
  try {
    // Pokušaj parsirati s date-fns parseISO (za ISO formate)
    const parsedWithIso = parseISO(dateString);
    if (isValid(parsedWithIso)) return parsedWithIso;
    
    // Ako to ne uspije, pokušaj s formatom
    const parsedWithFormat = parse(dateString, dateFormat, new Date());
    if (isValid(parsedWithFormat)) return parsedWithFormat;
    
    // Ako ni to ne uspije, probaj s konstruktorom
    const parsedWithConstructor = new Date(dateString);
    if (isValid(parsedWithConstructor)) return parsedWithConstructor;
    
    return null;
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
}

/**
 * Uspoređuje dva datuma (samo po danu, mjesecu i godini)
 */
export function areDatesEqual(date1: Date | string | null, date2: Date | string | null): boolean {
  if (!date1 || !date2) return false;
  
  try {
    const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
    const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
    
    return format(d1, 'yyyy-MM-dd') === format(d2, 'yyyy-MM-dd');
  } catch (error) {
    console.error('Error comparing dates:', error);
    return false;
  }
}

/**
 * Vraća mjesec iz datuma (0-11)
 * @param date - Datum iz kojeg treba vratiti mjesec
 */
export function getMonth(date: Date): number {
  return date.getMonth();
}

/**
 * Vraća dan u mjesecu iz datuma (1-31)
 * @param date - Datum iz kojeg treba vratiti dan
 */
export function getDate(date: Date): number {
  return date.getDate();
}