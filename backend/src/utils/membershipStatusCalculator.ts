// backend/src/utils/membershipStatusCalculator.ts
import { getCurrentYear } from './dateUtils.js';

export interface MembershipStatusResult {
  isValid: boolean; // Je li članstvo važeće
  reason: string; // Razlog statusa
  status: 'pending' | 'registered' | 'inactive'; // Glavni status
}

/**
 * Kalkulira status članstva na temelju plaćanja i izdane markice
 *
 * @param feePaymentYear Godina plaćanja
 * @param feePaymentDate Datum plaćanja
 * @param cardStampIssued Je li markica izdana
 * @param hasMembershipPeriod Ima li aktivni membership period (end_date: null)
 */
export function calculateMembershipStatus(
  feePaymentYear: number | null | undefined,
  feePaymentDate: string | Date | null | undefined,
  cardStampIssued: boolean | null | undefined,
  hasMembershipPeriod: boolean
): MembershipStatusResult {
  const currentYear = getCurrentYear();

  // Ako nema plaćanja ili datuma plaćanja, status je na čekanju (novi član)
  if (!feePaymentYear || !feePaymentDate) {
    return {
      isValid: false,
      reason: 'Payment not recorded',
      status: 'pending'
    };
  }

  // Ako nema aktivnog perioda članstva ALI ima plaćanje, član je neaktivan (bivši član koji je platio)
  // Novi članovi obično nemaju period dok se ne aktiviraju, ali ni plaćanje, pa će već biti uhvaćeni gore
  if (!hasMembershipPeriod) {
    return {
      isValid: false,
      reason: 'No active membership period',
      status: 'inactive'
    };
  }

  // Provjeri je li plaćena članarina za trenutnu ILI sljedeću godinu (renewal payment)
  const isPaymentCurrent = feePaymentYear === currentYear;
  const isRenewalPayment = feePaymentYear === currentYear + 1;
  
  if (!isPaymentCurrent && !isRenewalPayment) {
    // GRACE PERIOD: Ako ima aktivni period (end_date: null), još je u grace periodu
    // Status: 'pending' = "Na čekanju" (žuto) - čeka uplatu
    // Nakon auto-terminacije, membership period se završava i status ostaje 'inactive'
    return {
      isValid: false,
      reason: `Payment year (${feePaymentYear}) does not match current year (${currentYear}) - Grace period active`,
      status: 'pending' // Grace period = pending (Na čekanju, ali još nije bivši)
    };
  }

  // KRITIČNO: Provjeri je li izdana markica za tekuću godinu
  if (!cardStampIssued) {
    return {
      isValid: false,
      reason: 'Card stamp not issued for current year',
      status: 'pending'
    };
  }

  // Sve uvjete ispunjeni - članstvo je važeće
  return {
    isValid: true,
    reason: 'All conditions met',
    status: 'registered'
  };
}
