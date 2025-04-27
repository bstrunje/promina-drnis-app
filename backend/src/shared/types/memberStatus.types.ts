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

// Prioriteti za različite tipove statusa članstva
// Viši broj znači veći prioritet
export enum MembershipStatusPriority {
  DEATH = 100,       // najviši prioritet
  EXPULSION = 90,
  WITHDRAWAL = 80,
  INACTIVE = 70,
  PENDING = 60,
  ACTIVE = 50,       // najniži prioritet
}

// Prošireni tip rezultata statusa s više detalja
export interface DetailedMembershipStatus {
  status: MembershipStatus;
  priority: number;
  reason?: string;
  date?: Date | string | null; 
  endReason?: EndReason | null; 
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
  // Koristimo unaprijeđenu funkciju i vraćamo samo status
  return determineDetailedMembershipStatus(member, periods, currentYear).status;
}

/**
 * Unaprijeđena verzija funkcije za određivanje statusa koja vraća više detalja
 * uključujući razlog, datum i prioritet.
 * 
 * Implementira naprednije prioritete:
 * 1. Smrt člana ima najviši prioritet
 * 2. Isključenje iz članstva ima sljedeći najviši prioritet
 * 3. Dobrovoljno povlačenje
 * 4. Neaktivnost (bez aktivnih perioda)
 * 5. Neplaćena članarina
 * 6. Aktivni član s urednim statusom
 * 
 * @param member Podaci o članu
 * @param periods Lista perioda članstva
 * @param currentYear Opcionalno, trenutna godina (za testiranje)
 * @returns Detalji o statusu članstva
 */
export function determineDetailedMembershipStatus(
  member: MemberStatusData, 
  periods: MembershipPeriod[],
  currentYear?: number
): DetailedMembershipStatus {
  // Najprije provjerimo ima li završenih perioda s posebnim razlozima
  if (periods && periods.length > 0) {
    // Pronađi zadnji završeni period s razlogom
    const lastPeriodWithReason = findLastPeriodWithSpecificEndReason(periods);
    
    if (lastPeriodWithReason) {
      // Smrt ima najviši prioritet
      if (lastPeriodWithReason.end_reason === 'death') {
        return {
          status: 'inactive',
          priority: MembershipStatusPriority.DEATH,
          reason: 'Smrt člana',
          date: lastPeriodWithReason.end_date,
          endReason: 'death'
        };
      }
      
      // Isključenje ima drugi najviši prioritet
      if (lastPeriodWithReason.end_reason === 'expulsion') {
        return {
          status: 'inactive',
          priority: MembershipStatusPriority.EXPULSION,
          reason: 'Isključen iz članstva',
          date: lastPeriodWithReason.end_date,
          endReason: 'expulsion'
        };
      }
      
      // Dobrovoljno povlačenje ima treći najviši prioritet
      if (lastPeriodWithReason.end_reason === 'withdrawal') {
        return {
          status: 'inactive',
          priority: MembershipStatusPriority.WITHDRAWAL,
          reason: 'Dobrovoljno povlačenje',
          date: lastPeriodWithReason.end_date,
          endReason: 'withdrawal'
        };
      }
    }
  }
  
  // Prioritet: Provjeri postoji li aktivan period
  const hasActivePeriod = hasActiveMembershipPeriod(periods);
  if (!hasActivePeriod) {
    // Nema aktivnih perioda, ali provjeri također zadnji završeni period
    const lastEndedPeriod = findLastEndedPeriod(periods);
    return {
      status: 'inactive',
      priority: MembershipStatusPriority.INACTIVE,
      reason: 'Članstvo završeno',
      date: lastEndedPeriod?.end_date,
      endReason: lastEndedPeriod?.end_reason || 'other'
    };
  }
  
  // Prioritet: Provjeri bazu podataka za eksplicitni 'inactive' status
  if (member.status === 'inactive') {
    return {
      status: 'inactive',
      priority: MembershipStatusPriority.INACTIVE,
      reason: 'Neaktivan status u sustavu'
    };
  }
  
  // Prioritet: Provjeri je li članarina plaćena
  const hasPaidFee = hasPaidMembershipFee(member, currentYear);
  if (!hasPaidFee) {
    const year = currentYear || getCurrentYear();
    return {
      status: 'pending',
      priority: MembershipStatusPriority.PENDING,
      reason: `Članarina nije plaćena za ${year}. godinu`
    };
  }
  
  // Prioritet: Default status za članove s aktivnim periodima i plaćenom članarinom
  return {
    status: 'registered',
    priority: MembershipStatusPriority.ACTIVE,
    reason: 'Aktivan član s plaćenom članarinom'
  };
}

/**
 * Pronalazi zadnji završeni period članstva koji ima specifičan razlog završetka
 * (smrt, isključenje, povlačenje)
 * 
 * @param periods Lista perioda članstva
 * @returns Zadnji period s važnim razlogom završetka ili null
 */
export function findLastPeriodWithSpecificEndReason(
  periods: MembershipPeriod[]
): MembershipPeriod | null {
  const significantReasons: EndReason[] = ['death', 'expulsion', 'withdrawal'];
  
  // Filtriraj periode koji imaju specifične razloge završetka
  const periodsWithReason = periods
    .filter(p => p.end_date && p.end_reason && significantReasons.includes(p.end_reason))
    .sort((a, b) => {
      // Sortiraj po datumu završetka, od najnovijeg prema najstarijem
      const dateA = a.end_date ? new Date(a.end_date).getTime() : 0;
      const dateB = b.end_date ? new Date(b.end_date).getTime() : 0;
      return dateB - dateA;
    });
  
  // Vrati najnoviji ili null ako nema takvih perioda
  return periodsWithReason.length > 0 ? periodsWithReason[0] : null;
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
 * Vraća čitljivi opis statusa članstva na temelju detaljnog statusa
 * Korisno za prikaz u korisničkom sučelju
 * 
 * @param status Detalji o statusu članstva
 * @returns Čitljivi opis statusa
 */
export function getMembershipStatusDescription(status: DetailedMembershipStatus): string {
  if (status.reason) {
    return status.reason;
  }
  
  switch (status.status) {
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