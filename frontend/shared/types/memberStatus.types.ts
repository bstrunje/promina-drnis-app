/**
 * Tipovi i funkcije za konzistentno određivanje statusa članstva
 * Ova datoteka služi kao centralno mjesto za definiranje logike statusa
 * i koristi se i na frontendu i na backendu
 */

import { MembershipEndReason, MembershipPeriod as OriginalMembershipPeriod } from './membership.js';

// Interne helper funkcije za rad s datumima
// Definirane su ovdje kako bi shared tipovi bili neovisni


// Tipovi članstva
export type MembershipStatus = 'registered' | 'inactive' | 'pending';
export type ActivityStatus = 'active' | 'passive';
export type FeeStatus = 'current' | 'payment required';
export type EndReason = MembershipEndReason | 'inactivity' | 'other';

// Tipovi perioda članstva
export interface MembershipPeriod {
  period_id?: number;
  start_date: string;
  end_date?: string | null;
  end_reason?: EndReason | null;
}

/**
 * Pomoćni adapter za konverziju originalnog MembershipPeriod tipa u naš MembershipPeriod tip
 * Ovo osigurava tipsku sigurnost prilikom korištenja različitih tipova u aplikaciji
 */
export function adaptMembershipPeriods(periods: OriginalMembershipPeriod[]): MembershipPeriod[] {
  return periods.map(period => ({
    period_id: period.period_id,
    start_date: period.start_date,
    end_date: period.end_date ?? null,
    end_reason: period.end_reason ?? null
  }));
}

// Osnovni tip s potrebnim podacima za određivanje statusa
export interface MemberStatusData {
  status?: MembershipStatus;
  total_hours?: string | number;
  activity_hours?: string | number; // Sati za prošlu i tekuću godinu (za status aktivnosti)
  card_number?: string;
  membership_details?: {
    fee_payment_year?: number;
    fee_payment_date?: string;
    card_number?: string;
  };
}

/**
 * Funkcija za dobivanje trenutne godine
 * 
 * NAPOMENA: Ova funkcija koristi new Date() jer shared folder mora biti kompatibilan
 * s backendom koji ne koristi Time Traveler. Frontend će koristiti vlastitu
 * Time Traveler-aware verziju iz dateUtils.ts.
 */
export function getCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Provjerava postoji li barem jedan period s end_date === null (aktivan period)
 * @param periods Lista perioda članstva
 * @returns true ako postoji barem jedan aktivan period, false inače
 */
export function hasActiveMembershipPeriod(periods: MembershipPeriod[]): boolean {
  return periods.some(period => period.end_date === null);
}

/**
 * Provjera ima li član aktivne periode članstva
 * @param periods Lista perioda članstva
 * @returns true ako postoji barem jedan aktivan period, false inače
 */
export function hasActiveMembershipPeriods(periods: MembershipPeriod[]): boolean {
  return periods.some(isMembershipPeriodActive);
}

/**
 * Određuje je li period članstva aktivan
 * @param period Period članstva za provjeru
 * @returns true ako je period aktivan, false inače
 */
export function isMembershipPeriodActive(period: MembershipPeriod): boolean {
  return !period.end_date;
}

/**
 * Provjera je li član platio članarinu za tekuću ili sljedeću godinu
 * @param member Podaci o članu
 * @param currentYear Opcionalno, trenutna godina (za testiranje)
 * @returns true ako je članarina plaćena, false inače
 * 
 * NAPOMENA: Prihvaća se i uplata za sljedeću godinu (renewal payment)
 * jer članstvo ostaje aktivno do kraja trenutne godine
 */
export function hasPaidMembershipFee(member: MemberStatusData, currentYear?: number): boolean {
  const year = currentYear ?? getCurrentYear();
  const paymentYear = member.membership_details?.fee_payment_year;
  
  if (!paymentYear) return false;
  
  // Uplata je validna za trenutnu ILI sljedeću godinu (renewal period)
  return paymentYear === year || paymentYear === year + 1;
}

/**
 * Određuje status plaćanja članarine (Fee Status)
 * @param member Podaci o članu
 * @param currentYear Opcionalno, trenutna godina (za testiranje)
 * @returns 'current' ako je članarina plaćena za tekuću ili sljedeću godinu, 'payment required' inače
 */
export function determineFeeStatus(member: MemberStatusData, currentYear?: number): FeeStatus {
  return hasPaidMembershipFee(member, currentYear) ? 'current' : 'payment required';
}

/**
 * Provjera da li je članarina plaćena za specifičnu godinu
 * @param member Podaci o članu
 * @param yearToCheck Godina za koju provjeravamo plaćanje
 * @returns true ako je članarina plaćena za specificiranu godinu, false inače
 */
export function isFeePaidForYear(member: MemberStatusData, yearToCheck: number): boolean {
  const paymentYear = member.membership_details?.fee_payment_year;
  return paymentYear === yearToCheck;
}

/**
 * Određuje status aktivnosti člana na temelju broja odrađenih sati za prošlu i tekuću godinu
 * @param member Podaci o članu
 * @param thresholdHours Prag sati za aktivan status (default 20)
 * @returns 'active' ako član ima dovoljno sati (activity_hours), 'passive' inače
 */
export function determineMemberActivityStatus(member: MemberStatusData, thresholdHours = 20): ActivityStatus {
  const activityHours = typeof member.activity_hours === 'string' 
    ? parseFloat(member.activity_hours) 
    : Number(member.activity_hours ?? 0);
    
  return activityHours >= thresholdHours ? 'active' : 'passive';
}

// Prošireni tip rezultata statusa s više detalja
export interface DetailedMembershipStatus {
  status: MembershipStatus;
  reason?: string;
  date?: Date | string | null; 
  endReason?: EndReason | null; 
}

/**
 * GLAVNI ALGORITAM: Određuje status članstva na temelju svih relevantnih faktora
 * Implementira logiku za određivanje statusa:
 * 
 * @param member Podaci o članu
 * @param periods Lista perioda članstva
 * @param currentYear Opcionalno, trenutna godina (za testiranje)
 * @returns Status članstva
 */
export function determineMembershipStatus(
  member: MemberStatusData, 
  periods: MembershipPeriod[],
  currentYear?: number
): MembershipStatus {
  // Koristimo unaprijeđenu funkciju i vraćamo samo status
  return determineDetailedMembershipStatus(member, periods, currentYear).status;
}

/**
 * Unaprijeđena verzija funkcije za određivanje statusa koja vraća više detalja
 * 
 * @param member Detalji o članu
 * @param periods Lista perioda članstva
 * @param currentYear Opcionalno, trenutna godina (za testiranje)
 * @returns Detaljan status članstva
 */
export function determineDetailedMembershipStatus(
  member: MemberStatusData,
  periods: MembershipPeriod[],
  currentYear?: number // Godina za provjeru plaćanja (mock-aware)
): DetailedMembershipStatus {
  // 1. Provjera aktivnog perioda članstva - ovo je najvažniji pokazatelj
  if (hasActiveMembershipPeriod(periods)) {
    // Ako postoji aktivan period, provjeri i plaćanje članarine
    // Proslijeđujemo currentYear parametar za mock-aware provjeru
    if (hasPaidMembershipFee(member, currentYear)) {
      return {
        status: 'registered',
        reason: 'Aktivno članstvo s plaćenom članarinom'
      };
    } else {
      // Aktivan period, ali nije plaćena članarina -> status je 'pending'
      return {
        status: 'pending',
        reason: 'Potrebna uplata članarine za tekuću godinu'
      };
    }
  }

  // 2. Ako nema aktivnog perioda, provjeravamo specifične statuse

  // Ako je status 'pending', član je vjerojatno novi i čeka prvu uplatu
  if (member.status === 'pending') {
    return {
      status: 'pending',
      reason: 'Registracija u tijeku'
    };
  }

  // Ako je status eksplicitno 'inactive' u bazi
  if (member.status === 'inactive') {
    const lastEndedPeriod = findLastEndedPeriod(periods);
    return {
      status: 'inactive',
      reason: 'Članstvo isteklo',
      date: lastEndedPeriod?.end_date,
      endReason: lastEndedPeriod?.end_reason ?? 'inactivity'
    };
  }

  // 3. Ako status nije ni aktivan, ni pending, ni inactive - mora biti neaktivan
  // Ovo hvata sve ostale slučajeve (npr. 'registered' status u bazi, ali bez aktivnog perioda)
  const lastEndedPeriod = findLastEndedPeriod(periods);
  const reason = lastEndedPeriod 
    ? 'Članstvo završeno' 
    : 'Članarina nije plaćena ili članstvo nije aktivirano';

  return {
    status: 'inactive',
    reason: reason,
    date: lastEndedPeriod?.end_date,
    endReason: lastEndedPeriod?.end_reason ?? 'inactivity'
  };
}

/**
 * Pronalazi zadnji završeni period članstva
 * Korisno za prikaz informacija o razlogu završetka članstva
 * 
 * @param periods Lista perioda članstva
 * @returns Zadnji završeni period ili null ako nema završenih perioda
 */
export function findLastEndedPeriod(periods: MembershipPeriod[]): MembershipPeriod | null {
  if (!periods || periods.length === 0) return null;
  
  // Kopiraj listu i sortiraj po datumu završetka (najnoviji prvo)
  return [...periods]
    .filter(p => p.end_date && p.end_reason)
    .sort((a, b) => {
      // TypeScript zaštita - već smo filtrirali null vrijednosti
      const dateA = new Date(a.end_date!);
      const dateB = new Date(b.end_date!);
      return dateB.getTime() - dateA.getTime();
    })[0] || null;
}

/**
 * Prevodi razlog završetka članstva u čitljivi oblik
 * 
 * @param reason Razlog završetka članstva
 * @returns Čitljivi oblik razloga
 */
export function translateEndReason(reason: EndReason): string {
  const translations: Record<string, string> = {
    'withdrawal': 'Istupanje',
    'expulsion': 'Isključenje',
    'death': 'Smrt',
    'inactivity': 'Neaktivnost',
    'non_payment': 'Neplaćanje članarine',
    'other': 'Ostalo'
  };
  
  return translations[reason] || reason;
}

/**
 * Dobiva čitljivi opis statusa članstva
 * @param status Detalji o statusu članstva ili string vrijednost statusa
 * @returns Čitljivi opis statusa
 */
export function getMembershipStatusDescription(status: DetailedMembershipStatus | string): string {
  // Ako je status string, pretvaramo ga u odgovarajući status objekt
  if (typeof status === 'string') {
    return getDescriptionFromStatusString(status);
  }
  
  // Ako objekt ima reason, vraćamo ga
  if (status.reason) {
    return status.reason;
  }
  
  // Inače vraćamo opis na temelju statusa
  return getDescriptionFromStatusString(status.status);
}

/**
 * Pomoćna funkcija za dobivanje opisa na temelju stringa statusa
 */
function getDescriptionFromStatusString(statusStr: string): string {
  switch (statusStr) {
    case 'registered':
      return 'Aktivan član';
    case 'inactive':
      return 'Neaktivan član';
    case 'pending':
      return 'Status na čekanju';
    default:
      return 'Nepoznat status';
  }
}