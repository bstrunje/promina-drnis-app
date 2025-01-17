// shared/types/auth.ts
import { Member } from './member.js';

export interface LoginCredentials {
    full_name: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    member: {
        member_id: number;
        full_name: string;
        role: Member['role'];
    };
}

export interface RegisterResponse {
    message: string;
    member_id: number;
    full_name: string;
    email: string;
}

export interface SetPasswordRequest {
    member_id: number;
    suffix_numbers: string;
}

export interface AuthToken {
    member_id: number;
    role: Member['role'];
    iat: number;
    exp: number;
}

export interface TokenValidationResponse {
    isValid: boolean;
    member?: Pick<Member, 'member_id' | 'role' | 'full_name'>;
}

export interface AuthValidationError {
    message: string;
    code: 'INVALID_CREDENTIALS' | 'EXPIRED_TOKEN' | 'INVALID_TOKEN' | 'NOT_AUTHORIZED' | 'VALIDATION_ERROR';
    status: number;
}

export interface AuthSearchResult {
    member_id: number;
    full_name: string;
}