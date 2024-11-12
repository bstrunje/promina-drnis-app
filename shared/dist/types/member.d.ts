export type MembershipType = 'active' | 'passive';
export interface Member {
    member_id: number;
    first_name: string;
    last_name: string;
    join_date: string;
    membership_type: MembershipType;
    phone?: string;
    emergency_contact?: string;
    total_hours?: number;
    notes?: string;
}
export interface MemberCreate extends Omit<Member, 'member_id'> {
}
export interface MemberUpdate extends Partial<Member> {
    member_id: number;
}
