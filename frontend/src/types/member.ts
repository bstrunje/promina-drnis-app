export interface Member {
    member_id: number;
    first_name: string;
    last_name: string;
    join_date: string;
    membership_type: 'active' | 'passive';
    phone?: string;
    emergency_contact?: string;
    total_hours?: number;
    notes?: string;
  }