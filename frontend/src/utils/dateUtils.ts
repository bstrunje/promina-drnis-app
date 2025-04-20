/**
 * Utility funkcije za rad s datumima, uključujući mogućnost simulacije datuma za testiranje
 */
import { format, parseISO, isValid, parse } from 'date-fns';
import { hr } from 'date-fns/locale';

// Spremnik za mock datum koji će se koristiti umjesto stvarnog datuma
let mockDate: Date | null = null;

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
  mockDate = date;
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
 * Formatira datum za input[type="date"] polja (YYYY-MM-DD)
 * @param date - Datum ili string
 */
export function formatInputDate(date: Date | string | null): string {
  if (!date) return '';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
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
 * Resetira mock datum na null (vraća korištenje stvarnog sistemskog datuma)
 */
export function resetMockDate(): void {
  mockDate = null;
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