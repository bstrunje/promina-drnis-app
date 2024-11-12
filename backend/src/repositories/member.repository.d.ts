// backend/src/repositories/member.repository.d.ts

export interface Member {
  member_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  emergency_contact: string;
  notes: string;
  user_id: number;
  username: string;
  role: string;
  total_hours?: number;
}

export interface MemberStats {
  total_activities: number;
  total_hours: number;
  membership_type: string;
  status: string;
}

declare const memberRepository: {
  findAll(): Promise<Member[]>;
  findById(memberId: number): Promise<Member | undefined>;
  update(memberId: number, memberData: Partial<Member>): Promise<Member>;
  getStats(memberId: number): Promise<MemberStats>;
  create(memberData: Omit<Member, 'member_id' | 'user_id'>): Promise<Member>;
  delete(memberId: number): Promise<Member | undefined>;
};

export default memberRepository;