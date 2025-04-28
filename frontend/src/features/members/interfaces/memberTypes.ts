import { Member } from '@shared/member';
import { DetailedMembershipStatus } from '@shared/memberStatus.types';

/**
 * Interface za detalje o članskoj iskaznici
 */
export interface MemberCardDetails {
  card_number?: string;
  stamp_type?: "employed" | "student" | "pensioner";
  fee_payment_year?: number;
  has_stamp?: boolean;
  card_stamp_issued?: boolean;
}

/**
 * Prošireni interface za članove s dodatnim detaljima za prikaz i upravljanje
 */
export interface MemberWithDetails extends Member {
  cardDetails?: MemberCardDetails;
  membershipStatus?: 'registered' | 'inactive' | 'pending';
  detailedStatus?: DetailedMembershipStatus;
  isActive?: boolean;
  feeStatus?: 'current' | 'payment required';
}
