/**
 * Utility funkcije za rad s datumima, uključujući mogućnost simulacije datuma za testiranje
 */
import { format, parseISO, isValid, parse } from 'date-fns';
import { hr, enUS } from 'date-fns/locale';
import { TIME_ZONE_CACHE_KEY } from '@/context/timeZone-core';

// Funkcija za dohvat trenutno konfigurirane vremenske zone
let currentTimeZone = 'Europe/Zagreb'; // Zadana vrijednost

// Mock datum za testiranje (frontend state)
let mockDate: Date | null = null;

// Ključ za localStorage
const MOCK_DATE_KEY = 'app_mock_date';

// Učitaj mock datum iz localStorage pri inicijalizaciji
if (typeof window !== 'undefined') {
  try {
    const storedMockDate = localStorage.getItem(MOCK_DATE_KEY);
    if (storedMockDate) {
      mockDate = new Date(storedMockDate);
      console.log('🔄 Mock datum učitan iz localStorage:', mockDate.toISOString());
    }
  } catch (error) {
    console.warn('Greška pri učitavanju mock datuma iz localStorage:', error);
  }
  
  // Slušaj promjene u localStorage između tabova
  window.addEventListener('storage', (event) => {
    if (event.key === MOCK_DATE_KEY) {
      try {
        if (event.newValue) {
          mockDate = new Date(event.newValue);
          console.log('🔄 Mock datum ažuriran iz drugog taba:', mockDate.toISOString());
        } else {
          mockDate = null;
          console.log('🔄 Mock datum resetiran iz drugog taba');
        }
      } catch (error) {
        console.warn('Greška pri ažuriranju mock datuma iz drugog taba:', error);
      }
    }
  });
}

// Migracija starog ključa vremenske zone na neutralni naziv
// Ako postoji stari ključ 'promina_app_timezone' i nema novog 'app_timezone', preseli vrijednost
if (typeof window !== 'undefined') {
  try {
    const OLD_KEY = 'promina_app_timezone';
    const oldTz = localStorage.getItem(OLD_KEY);
    const newTz = localStorage.getItem(TIME_ZONE_CACHE_KEY);
    if (oldTz && !newTz) {
      localStorage.setItem(TIME_ZONE_CACHE_KEY, oldTz);
      localStorage.removeItem(OLD_KEY);
      currentTimeZone = oldTz;
    }
  } catch {
    // ignore
  }
}

/**
 * Postavlja vremensku zonu koja će se koristiti za sve funkcije formatiranja datuma
 * @param timeZone String s vremenskom zonom (npr. 'Europe/Zagreb', 'UTC')
 */
export function setCurrentTimeZone(timeZone: string): void {
  if (timeZone) {
    // Spremamo u globalnu varijablu
    currentTimeZone = timeZone;
    
    // Spremi i u localStorage za trajno pohranjivanje (neutralan ključ)
    localStorage.setItem(TIME_ZONE_CACHE_KEY, timeZone);
  }
}

/**
 * Vraća trenutno aktivnu vremensku zonu
 * @returns String s vremenskom zonom
 */
export function getCurrentTimeZone(): string {
  return currentTimeZone;
}

/**
 * Postavlja mock datum za testiranje
 * @param date Mock datum ili null za resetiranje
 */
export function setMockDate(date: Date | null): void {
  mockDate = date;
  
  // Spremi u localStorage da se dijeli između tabova
  if (typeof window !== 'undefined') {
    try {
      if (date) {
        localStorage.setItem(MOCK_DATE_KEY, date.toISOString());
      } else {
        localStorage.removeItem(MOCK_DATE_KEY);
      }
    } catch (error) {
      console.warn('Greška pri spremanju mock datuma u localStorage:', error);
    }
  }
  
  console.log('🔧 Frontend mock datum postavljen na:', date ? date.toISOString() : 'null');
}

/**
 * Resetira mock datum na stvarni datum
 */
export function resetMockDate(): void {
  mockDate = null;
  
  // Ukloni iz localStorage
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(MOCK_DATE_KEY);
    } catch (error) {
      console.warn('Greška pri uklanjanju mock datuma iz localStorage:', error);
    }
  }
  
  console.log('🔧 Frontend mock datum resetiran');
}

/**
 * Vraća trenutni datum (ili mock datum ako je postavljen)
 */
export function getCurrentDate(): Date {
  return mockDate ?? new Date();
}

/**
 * Vraća trenutnu godinu (npr. 2025) (ili godinu iz mock datuma ako je postavljen)
 */
export function getCurrentYear(): number {
  return getCurrentDate().getFullYear();
}

/**
 * Vraća STVARNU trenutnu godinu (ignorira mock datum)
 * Koristi se za provjere koje se odnose na stvarnu godinu (npr. plaćanje članarine)
 */
export function getRealCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Vraća godinu za provjeru plaćanja članarine
 * U produkciji vraća stvarnu godinu, u testu s mock datumom vraća mock godinu
 * Omogućava testiranje s mock datumom dok u produkciji koristi stvarnu godinu
 */
export function getYearForPaymentCheck(): number {
  // Ako je mock datum postavljen, koristi mock godinu za testiranje
  if (mockDate) {
    return getCurrentYear();
  }
  // Inače koristi stvarnu godinu
  return getRealCurrentYear();
}

/**
 * Pretvara ISO string ili Date objekt u željeni format prikaza
 * @param date Datum za formatiranje (ISO string, timestamp ili Date objekt)
 * @param pattern Obrazac formatiranja (npr. 'dd.MM.yyyy HH:mm:ss')
 * @returns Formatirani string datuma
 */
export function formatDate(
  date: string | Date | number | undefined | null,
  pattern = 'dd.MM.yyyy'
): string {
  if (!date) return '';

  try {
    // Pretvori u Date objekt, ovisi o tipu podatka
    let dateObj: Date;
    
    if (typeof date === 'string') {
      // Ako je string s ISO formatom (sadrži 'T'), koristi parseISO za precizniju obradu
      dateObj = date.includes('T') ? parseISO(date) : new Date(date);
    } else if (typeof date === 'number') {
      dateObj = new Date(date);
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      // Nepoznat tip – vraćamo prazan string
      return '';
    }
  
    if (!isValid(dateObj)) {
      return '';
    }
  
    // Koristi Intl.DateTimeFormat za formatiranje s ispravnom vremenskom zonom
    const formatter = new Intl.DateTimeFormat('hr-HR', {
      timeZone: currentTimeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: pattern.includes('HH') ? '2-digit' : undefined, 
      minute: pattern.includes('mm') ? '2-digit' : undefined,
      second: pattern.includes('ss') ? '2-digit' : undefined,
      hour12: false
    });
    
    const parts = formatter.formatToParts(dateObj);
    let formattedDate = pattern;
    
    // Zamijeni placeholdere s vrijednostima
    for (const part of parts) {
      switch (part.type) {
        case 'day':
          formattedDate = formattedDate.replace('dd', part.value);
          break;
        case 'month':
          formattedDate = formattedDate.replace('MM', part.value);
          break;
        case 'year':
          formattedDate = formattedDate.replace('yyyy', part.value);
          break;
        case 'hour':
          formattedDate = formattedDate.replace('HH', part.value);
          break;
        case 'minute':
          formattedDate = formattedDate.replace('mm', part.value);
          break;
        case 'second':
          formattedDate = formattedDate.replace('ss', part.value);
          break;
      }
    }
  
    return formattedDate;
  } catch (error) {
    console.error('Greška prilikom formatiranja datuma:', error);
    return '';
  }
  return '';
}

/**
 * Formatira datum za HTML <input type="date"> (yyyy-MM-dd)
 * @param date - Datum (Date objekt ili string)
 * @returns string u formatu yyyy-MM-dd ili prazan string ako nije valjan
 */
export function formatDateToIsoDateString(date: Date | string | null): string {
  if (!date) return '';
  let dateObj: Date | null = null;
  if (typeof date === 'string') {
    dateObj = parseDate(date);
  } else if (date instanceof Date) {
    dateObj = date;
  }
  if (dateObj && isValid(dateObj)) {
    return format(dateObj, 'yyyy-MM-dd');
  }
  return '';
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
    const date = parse(hrDate, 'dd.MM.yyyy', getCurrentDate());
    
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
 * @returns Date string u ISO 8601 DateTime formatu (npr. YYYY-MM-DDTHH:mm:ss.sssZ)
 */
// Formatira datum za prikaz i spremanje bez vremenske zone (npr. za datume rođenja)
export function formatInputDate(date: Date | string | null = null): string {
  if (!date) return '';
  let dateObj: Date | null = null;
  if (typeof date === 'string') {
    date = date.trim();
    if (date.startsWith('yyyy-MM-dd')) {
      date = date.substring(0, 10);
    }
    date = date.replace(/[^0-9\-T:.Z]/g, '');
    if (date.toUpperCase() === 'INVALID DATE') {
      console.warn('formatInputDate: Primljen je string "Invalid Date". Vraćam prazan string.');
      return '';
    }
    // Ako je već u formatu yyyy-MM-dd, vrati ga takvog
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    dateObj = parseISO(date);
    if (!isValid(dateObj)) {
      dateObj = parseDate(date);
      if (!dateObj || !isValid(dateObj)) {
        console.warn(`formatInputDate: Neuspješno parsiranje stringa '${date}'. Vraćam prazan string.`);
        return '';
      }
    }
  } else if (date instanceof Date) {
    dateObj = date;
  } else {
    console.warn('formatInputDate: Primljen nepoznat tip podatka za datum. Vraćam prazan string.');
    return '';
  }
  if (!dateObj || !isValid(dateObj)) {
    console.warn('formatInputDate: Kreirani Date objekt nije valjan. Vraćam prazan string.');
    return '';
  }
  // Vrati uvijek yyyy-MM-dd, bez vremena i vremenske zone
  return format(dateObj, 'yyyy-MM-dd');
}


/**
 * Parsira datum iz stringa u Date objekt
 * @param dateString - String koji sadrži datum
 * @param dateFormat - Format datuma (default: 'yyyy-MM-dd')
 * @returns Date | null
 */
export function parseDate(
  dateStringInput: string | null,
  dateFormat = 'yyyy-MM-dd',
): Date | null {
  if (!dateStringInput) {
    return null;
  }

  const dateString = dateStringInput.trim(); // Trim string

  let parsedDateInstance: Date | null = null;

  try {
    // Prioritetno pokušaj parsirati kao puni ISO string ako nema specifičnog formata
    if (dateFormat === 'yyyy-MM-dd' && dateString.includes('T')) {
      const isoParsed = parseISO(dateString);
      if (isValid(isoParsed)) return isoParsed;
    }

    // Rukovanje specifičnim formatima uz UTC konverziju
    if (dateFormat === 'dd.MM.yyyy') {
      const re = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;
      const parts = re.exec(dateString);
      if (parts?.[1] && parts[2] && parts[3]) {
        const day = parseInt(parts[1], 10);
        const month = parseInt(parts[2], 10) - 1; // Mjeseci su 0-indeksirani u Date
        const year = parseInt(parts[3], 10);
        const utcDate = new Date(Date.UTC(year, month, day));
        // Provjeri je li datum valjan nakon kreiranja (npr. 31.02. nije valjan)
        if (utcDate.getUTCFullYear() === year && utcDate.getUTCMonth() === month && utcDate.getUTCDate() === day) {
          parsedDateInstance = utcDate;
        } else {
          console.warn(`parseDate (dd.MM.yyyy): Nevažeći datum ${dateString}`);
        }
      } else {
        console.warn(`parseDate (dd.MM.yyyy): String '${dateString}' ne odgovara formatu.`);
      }
    } else if (dateFormat === 'yyyy-MM-dd') {
      // Ovdje želimo striktno YYYY-MM-DD bez vremena
      const re = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
      const parts = re.exec(dateString);
      if (parts?.[1] && parts[2] && parts[3]) {
        const year = parseInt(parts[1], 10);
        const month = parseInt(parts[2], 10) - 1;
        const day = parseInt(parts[3], 10);
        const utcDate = new Date(Date.UTC(year, month, day));
        if (utcDate.getUTCFullYear() === year && utcDate.getUTCMonth() === month && utcDate.getUTCDate() === day) {
          parsedDateInstance = utcDate;
        } else {
          console.warn(`parseDate (yyyy-MM-dd): Nevažeći datum ${dateString}`);
        }
      } else {
        // Ako ne odgovara YYYY-MM-DD, ali je možda puni ISO, pokušaj s parseISO
        const isoDate = parseISO(dateString);
        if (isValid(isoDate)) {
          return isoDate; // Vrati kao UTC ako je puni ISO
        }
        console.warn(`parseDate (yyyy-MM-dd): String '${dateString}' ne odgovara formatu yyyy-MM-dd.`);
      }
    } else {
      // Za sve ostale formate, koristi date-fns/parse
      // Napomena: parse iz date-fns ne stvara UTC datume po defaultu, nego lokalne.
      // Ako je potreban UTC za druge formate, ovo treba prilagoditi.
      const tempDate = parse(dateString, dateFormat, getCurrentDate(), { locale: hr });
      if (isValid(tempDate)) {
        parsedDateInstance = tempDate;
      }
    }
  } catch (error) {
    console.error('Greška prilikom parsiranja datuma:', dateString, dateFormat, error);
  }

  return parsedDateInstance && isValid(parsedDateInstance) ? parsedDateInstance : null;
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

/**
 * Validira datum rođenja - provjerava je li datum valjan i da nije u budućnosti
 * @param dateString - String koji sadrži datum rođenja
 * @param minAge - Minimalna dozvoljena dob (u godinama) - ako je navedeno
 * @returns Objekt s rezultatom validacije i porukom greške ako nije valjan
 */
export function validateBirthDate(
  dateString: string | null,
  minAge = 0
): { isValid: boolean; errorMessage?: string } {
  if (!dateString) {
    return { isValid: false, errorMessage: 'Datum rođenja je obavezan.' };
  }

  // dateString bi trebao biti puni ISO string (YYYY-MM-DDTHH:mm:ss.sssZ)
  let date = parseISO(dateString);

  if (!isValid(date)) {
    // Ako parseISO ne uspije, pokušaj parsirati s našom parseDate funkcijom
    // koja podržava više formata uključujući dd.MM.yyyy
    const parsed = parseDate(dateString, 'dd.MM.yyyy');
    if (parsed && isValid(parsed)) {
      date = parsed;
    } else {
      return { isValid: false, errorMessage: 'Neispravan format datuma rođenja.' };
    }
  }

  // Provjera je li datum u budućnosti
  // getCurrentDate() može vraćati mockDate, koji je već Date objekt
  const today = getCurrentDate(); 
  // Za usporedbu, normalizirajmo 'today' na početak dana u UTC-u ako već nije Date objekt ili je lokalni
  const todayUTCStart = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

  // Datum rođenja (date) je već UTC zbog parseISO
  if (date > todayUTCStart) {
    return { isValid: false, errorMessage: 'Datum rođenja ne može biti u budućnosti.' };
  }

  // Provjera minimalne dobi ako je postavljena
  if (minAge > 0) {
    let age = todayUTCStart.getUTCFullYear() - date.getUTCFullYear();
    const m = todayUTCStart.getUTCMonth() - date.getUTCMonth();
    if (m < 0 || (m === 0 && todayUTCStart.getUTCDate() < date.getUTCDate())) {
      age--;
    }
    if (age < minAge) {
      return { isValid: false, errorMessage: `Osoba mora imati najmanje ${minAge} godina.` };
    }
  }

  return { isValid: true };
}

/**
 * Provjerava je li datum valjan (nije u budućnosti i ima ispravan format)
 * @param dateString - String koji sadrži datum (očekuje se puni ISO string)
 * @param allowFutureDates - Dozvoljava li se da datum bude u budućnosti
 * @returns Objekt s rezultatom validacije i porukom greške ako nije valjan
 */
export function validateDate(
  dateString: string | null,
  allowFutureDates = false
): { isValid: boolean; errorMessage?: string } {
  if (!dateString) {
    return { isValid: false, errorMessage: 'Datum je obavezan.' };
  }

  // dateString bi trebao biti puni ISO string (YYYY-MM-DDTHH:mm:ss.sssZ)
  const date = parseISO(dateString);

  if (!isValid(date)) {
    // Fallback kao u validateBirthDate
    const parsedFallback = parseDate(dateString, 'dd.MM.yyyy');
    if (parsedFallback && isValid(parsedFallback)) {
      console.warn(`validateDate: Primljen dateString '${dateString}' koji nije validan ISO, ali je parsiran kao dd.MM.yyyy.`);
      return { isValid: false, errorMessage: 'Neispravan format datuma. Očekuje se ISO format.' };
    }
    return { isValid: false, errorMessage: 'Neispravan format datuma.' };
  }

  if (!allowFutureDates) {
    const today = getCurrentDate();
    const todayUTCStart = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    if (date > todayUTCStart) {
      return { isValid: false, errorMessage: 'Datum ne može biti u budućnosti.' };
    }
  }

  return { isValid: true };
}

/**
 * Vraća formatiran datum za prikaz s ugrađenom validacijom
 * @param dateString - String koji sadrži datum
 * @param defaultValue - Zadana vrijednost ako je datum prazan ili neispravan (default: '')
 * @returns Formatiran datum ili zadanu vrijednost
 */
export function getSafeFormattedDate(
  dateString: string | null,
  defaultValue = ''
): string {
  if (!dateString) return defaultValue;
  
  const parsedDate = parseDate(dateString);
  if (!parsedDate) return defaultValue;
  
  return formatDate(parsedDate);
}

/**
 * Čisti ISO string od dodatnih navodnika koji mogu biti dodani u formatiranju na backendu.
 * 
 * VAŽNO: Ovu funkciju OBAVEZNO koristiti prije formatiranja datuma koji dolaze s backenda,
 * posebno za datume vezane uz članarine i druge datume koji se formatiraju u member.controller.ts.
 * 
 * Problem: Backend ponekad vraća datume u formatu "2025-04-01'T'02:00:00.000'Z'" s dodatnim
 * navodnicima oko 'T' i 'Z' znakova, što uzrokuje probleme pri parsiranju u frontendu.
 * 
 * Primjer korištenja:
 * ```typescript
 * // Umjesto ovoga:
 * formatDate(member.membership_details.fee_payment_date, 'dd.MM.yyyy.')
 * 
 * // Koristiti ovo:
 * formatDate(cleanISODateString(member.membership_details.fee_payment_date), 'dd.MM.yyyy.')
 * ```
 * 
 * @param isoString ISO string datuma koji može sadržavati dodatne navodnike
 * @returns Očišćeni ISO string bez dodatnih navodnika
 */
export function cleanISODateString(isoString: string | null): string {
  if (!isoString) return '';
  
  // Zamjenjuje sve dodatne navodnike oko T i Z znakova
  return isoString
    .replace(/'T'/g, "T")
    .replace(/'Z'/g, "Z");
}

/**
 * Formatira ukupan broj minuta u sate i minute
 * @param totalMinutes Ukupan broj minuta
 * @returns string u formatu 'Xh Ym'
 */
export const formatMinutesToHoursAndMinutes = (totalMinutes: number | null | undefined): string => {
  if (totalMinutes === null || totalMinutes === undefined || totalMinutes < 0) {
    return '0h 0m';
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m`;
}
/**
 * Lokalizirani prikaz datuma prema jeziku ('hr', 'en', ...)
 * @param dateString ISO string ili Date objekt
 * @param localeCode 'hr' | 'en' (default 'hr')
 * @param formatStr npr. 'P' (default), ili custom 'dd.MM.yyyy'
 * @returns Lokalizirani string datuma
 */
export function formatDateLocalized(
  dateString: string | Date,
  localeCode = 'hr',
  formatStr = 'P'
): string {
  if (!dateString) return '';
  let dateObj: Date;
  if (typeof dateString === 'string') {
    dateObj = parseISO(dateString);
  } else {
    dateObj = dateString;
  }
  const locale = localeCode === 'hr' ? hr : enUS;
  if (!isValid(dateObj)) return '';
  return format(dateObj, formatStr, { locale });
};