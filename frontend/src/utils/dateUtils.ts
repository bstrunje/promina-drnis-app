/**
 * Utility funkcije za rad s datumima, uključujući mogućnost simulacije datuma za testiranje
 */
import { format, parseISO, isValid, parse } from 'date-fns';
import { hr } from 'date-fns/locale';

// Ključevi za localStorage
const MOCK_DATE_KEY = 'promina_mock_date';
const ORIGINAL_MOCK_DATE_KEY = 'promina_original_mock_date';
const HAS_ORIGINAL_STORED_KEY = 'promina_has_original_stored';

// Spremnik za mock datum koji će se koristiti umjesto stvarnog datuma
let mockDate: Date | null = null;

// Spremnik za originalne mock datume prije resetiranja
let originalMockDate: Date | null = null;
let hasOriginalBeenStored: boolean = false;

// Inicijalizacija i učitavanje mock datuma iz localStorage ako postoji
function initMockDate(): void {
  const storedMockDate = localStorage.getItem(MOCK_DATE_KEY);
  if (storedMockDate) {
    try {
      mockDate = new Date(storedMockDate);
      console.log(`📅 Mock datum učitan iz localStorage: ${mockDate.toISOString()}`);
    } catch (e) {
      console.error('Greška prilikom učitavanja mock datuma iz localStorage:', e);
      mockDate = null;
      localStorage.removeItem(MOCK_DATE_KEY);
    }
  }

  const storedOriginalMockDate = localStorage.getItem(ORIGINAL_MOCK_DATE_KEY);
  if (storedOriginalMockDate) {
    try {
      originalMockDate = new Date(storedOriginalMockDate);
    } catch (e) {
      originalMockDate = null;
      localStorage.removeItem(ORIGINAL_MOCK_DATE_KEY);
    }
  }

  const storedHasOriginal = localStorage.getItem(HAS_ORIGINAL_STORED_KEY);
  if (storedHasOriginal) {
    hasOriginalBeenStored = storedHasOriginal === 'true';
  }
}

// Pozovi inicijalizaciju odmah
initMockDate();

/**
 * Vraća trenutni datum - ako je postavljen mock datum, vraća njega, inače stvarni datum
 */
export function getCurrentDate(): Date {
  if (mockDate) {
    // Svakih 30 minuta osvježi podatak da sustav koristi mock datum (za dijagnostiku)
    const thirtyMinutesInMs = 30 * 60 * 1000;
    const now = new Date().getTime();
    const lastLog = parseInt(localStorage.getItem('promina_last_mock_date_log') || '0', 10);
    
    if (now - lastLog > thirtyMinutesInMs) {
      console.log(`📅 Koristi se simulirani datum: ${mockDate.toISOString()}`);
      localStorage.setItem('promina_last_mock_date_log', now.toString());
    }
    
    return mockDate;
  }
  return new Date();
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
    
    // Spremi u localStorage
    if (originalMockDate) {
      localStorage.setItem(ORIGINAL_MOCK_DATE_KEY, originalMockDate.toISOString());
    } else {
      localStorage.removeItem(ORIGINAL_MOCK_DATE_KEY);
    }
    localStorage.setItem(HAS_ORIGINAL_STORED_KEY, 'true');
  }
  
  mockDate = date;
  
  // Spremi u localStorage za trajnost
  if (mockDate) {
    localStorage.setItem(MOCK_DATE_KEY, mockDate.toISOString());
    console.log(`📅 Mock datum postavljen i spremljen u localStorage: ${mockDate.toISOString()}`);
  } else {
    localStorage.removeItem(MOCK_DATE_KEY);
    console.log('📅 Mock datum resetiran i uklonjen iz localStorage');
  }
}

/**
 * Resetira mock datum na null (vraća korištenje stvarnog sistemskog datuma)
 */
export function resetMockDate(): void {
  mockDate = null;
  hasOriginalBeenStored = false;
  
  // Očisti localStorage
  localStorage.removeItem(MOCK_DATE_KEY);
  localStorage.removeItem(ORIGINAL_MOCK_DATE_KEY);
  localStorage.removeItem(HAS_ORIGINAL_STORED_KEY);
  
  console.log('📅 Mock datum resetiran i uklonjeni svi podaci iz localStorage');
}

/**
 * Vraća mock datum na prethodnu vrijednost koja je bila prije mockanja
 * @returns true ako je uspješno vraćeno na originalnu vrijednost, false ako nema spremljenog originala
 */
export function restoreOriginalMock(): boolean {
  if (hasOriginalBeenStored) {
    mockDate = originalMockDate;
    hasOriginalBeenStored = false;
    
    // Ažuriraj localStorage
    if (mockDate) {
      localStorage.setItem(MOCK_DATE_KEY, mockDate.toISOString());
    } else {
      localStorage.removeItem(MOCK_DATE_KEY);
    }
    localStorage.removeItem(ORIGINAL_MOCK_DATE_KEY);
    localStorage.setItem(HAS_ORIGINAL_STORED_KEY, 'false');
    
    console.log(`📅 Mock datum vraćen na originalnu vrijednost: ${mockDate ? mockDate.toISOString() : 'null'}`);
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