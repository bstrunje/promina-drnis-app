/**
 * Tipovi i funkcije za konzistentno određivanje statusa članstva
 * Ova datoteka služi kao centralno mjesto za definiranje logike statusa
 * i koristi se i na frontendu i na backendu
 */

import { MembershipEndReason, MembershipPeriod as OriginalMembershipPeriod } from './membership.js';

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
    end_date: period.end_date || null,
    end_reason: period.end_reason || null
  }));
}

// Osnovni tip s potrebnim podacima za određivanje statusa
export interface MemberStatusData {
  status?: MembershipStatus;
  total_hours?: string | number;
  membership_details?: {
    fee_payment_year?: number;
    fee_payment_date?: string;
  };
}

/**
 * Funkcija za dobivanje trenutne godine
 * Izdvojena kao zasebna funkcija za lakše testiranje i mockanje
 */
export function getCurrentYear(): number {
  return new Date().getFullYear();
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
 * Provjera ima li član aktivne periode članstva
 * @param periods Lista perioda članstva
 * @returns true ako postoji barem jedan aktivan period, false inače
 */
export function hasActiveMembershipPeriod(periods: MembershipPeriod[]): boolean {
  return periods.some(isMembershipPeriodActive);
}

/**
 * Provjera je li član platio članarinu za tekuću ili sljedeću godinu
 * @param member Podaci o članu
 * @param currentYear Opcionalno, trenutna godina (za testiranje)
 * @returns true ako je članarina plaćena, false inače
 */
export function hasPaidMembershipFee(member: MemberStatusData, currentYear?: number): boolean {
  const year = currentYear || getCurrentYear();
  const paymentYear = member.membership_details?.fee_payment_year;
  
  if (!paymentYear) return false;
  
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
 * Određuje status aktivnosti člana na temelju broja odrađenih sati
 * @param member Podaci o članu
 * @returns 'active' ako član ima 20+ sati, 'passive' inače
 */
export function determineMemberActivityStatus(member: MemberStatusData): ActivityStatus {
  const totalHours = typeof member.total_hours === 'string' 
    ? parseFloat(member.total_hours) 
    : Number(member.total_hours || 0);
    
  return totalHours >= 20 ? 'active' : 'passive';
}

/**
 * GLAVNI ALGORITAM: Određuje status članstva na temelju svih relevantnih faktora
 * Implementira prioritete za određivanje statusa:
 * 1. Ako član nema aktivnih perioda, vraća 'inactive'
 * 2. Ako član ima status 'inactive' iz baze, vraća 'inactive'
 * 3. Ako član nije platio članarinu, vraća 'pending'
 * 4. Inače vraća 'registered'
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
  // Prioritet 1: Provjeri postoji li aktivan period
  const hasActivePeriod = hasActiveMembershipPeriod(periods);
  if (!hasActivePeriod) {
    return 'inactive';
  }
  
  // Prioritet 2: Provjeri bazu podataka za eksplicitni 'inactive' status
  if (member.status === 'inactive') {
    return 'inactive';
  }
  
  // Prioritet 3: Provjeri je li članarina plaćena
  const hasPaidFee = hasPaidMembershipFee(member, currentYear);
  if (!hasPaidFee) {
    return 'pending';
  }
  
  // Prioritet 4: Default status za članove s aktivnim periodima i plaćenom članarinom
  return 'registered';
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