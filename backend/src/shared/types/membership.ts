// shared/types/membership.ts

export type MembershipEndReason = 'withdrawal' | 'non_payment' | 'expulsion' | 'death';

export interface MembershipPeriod {
    period_id: number;
    member_id: number;
    start_date: string; // Changed from Date to string since we're working with ISO strings
    end_date?: string; // Changed from Date to string
    end_reason?: MembershipEndReason;
}

export interface MembershipDetails {
    card_number?: string;
    fee_payment_year?: number;
    card_stamp_issued?: boolean;
    next_year_stamp_issued?: boolean; // Dodano za praćenje markica izdanih za sljedeću godinu
    fee_payment_date?: string;
    life_status?: string;
}

export interface MembershipHistory {
    periods: MembershipPeriod[];
    total_duration?: string; // Calculated field
    current_period?: MembershipPeriod;
}