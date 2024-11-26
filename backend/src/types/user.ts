export interface User {
  member_id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  password_hash: string;
  role: 'member' | 'admin' | 'superuser';
  status: 'active' | 'pending' | 'inactive';
}

export interface UserLogin {
  full_name: string;
  password: string;
}