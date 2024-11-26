// shared/types/member.ts
export type MembershipType = 'regular' | 'supporting' | 'honorary';
export type MemberStatus = 'pending' | 'active' | 'passive';


export interface Member {
    member_id: number;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    street_address: string;
    city: string;
    oib: string;
    cell_phone: string;
    email: string;
    life_status: 'employed/unemployed' | 'child/pupil/student' | 'pensioner';
    tshirt_size: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL';
    shell_jacket_size: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL';
    membership_type: MembershipType;
    status: MemberStatus;
    full_name?: string;
    total_hours?: number;
}