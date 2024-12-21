// Create new file: backend/src/types/membership.types.ts
export type MembershipEndReason = 'withdrawal' | 'non_payment' | 'expulsion' | 'death';

export interface MembershipPeriod {
    period_id: number;
    member_id: number;
    start_date: Date;
    end_date?: Date;
    end_reason?: MembershipEndReason;
}

export interface MembershipDetails {
    card_number?: string;
    fee_payment_year?: number;
    card_stamp_issued?: boolean;
    fee_payment_date?: string;
    life_status?: string;
}

export interface MembershipHistory {
    periods: MembershipPeriod[];
    total_duration?: string;
    current_period?: MembershipPeriod;
}