// backend/src/types/user.ts

export interface User {
    id: number;
    user_id: number;
    member_id: number;
    first_name: string;
    last_name: string;
    username: string;
    email: string;
    password: string;
    password_hash: string;
    role: 'member' | 'admin' | 'superuser';
  status: 'active' | 'inactive' | 'suspended';
    
}

export interface UserRegistrationData {
    username: string;
    email: string;
    password: string;
    hashedPassword?: string;
    role?: string;
    firstName: string;
    lastName: string;
    
}