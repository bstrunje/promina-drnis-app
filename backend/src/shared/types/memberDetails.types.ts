import { Member } from './member.js';
import { MembershipDetails } from './membership.js';
import { DetailedMembershipStatus, MembershipPeriod } from './memberStatus.types.js';

/**
 * Interface za detalje o članskoj iskaznici
 */
export interface MemberCardDetails {
  card_number?: string;
  stamp_type?: 'employed' | 'student' | 'pensioner';
  fee_payment_year?: number;
  has_stamp?: boolean;
  card_stamp_issued?: boolean;
}

/**
 * Prošireni interface za članove s dodatnim detaljima za prikaz i upravljanje
 */
export interface MemberWithDetails extends Member {
  // Detalji o članstvu (izvor istine, uvijek prisutno)
  membership_details: MembershipDetails;
  membershipStatus?: 'registered' | 'inactive' | 'pending';
  detailedStatus?: DetailedMembershipStatus;
  isActive?: boolean;
  feeStatus?: 'current' | 'payment required';
  periods?: MembershipPeriod[];
  /**
   * Funkcije u Društvu (Predsjednik, Tajnik, Blagajnik...)
   * Višestruke vrijednosti odvojene zarezom, npr. "Predsjednik, Tajnik"
   */
  functions_in_society?: string;
}
