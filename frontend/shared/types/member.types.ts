export type MemberRole = 'member' | 'admin' | 'superuser';

export interface Member {
  member_id: number;
  full_name: string;
  email?: string;
  role: MemberRole;
  // ...other fields
}
