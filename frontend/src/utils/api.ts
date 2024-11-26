import axios from 'axios';
import { Member } from '@shared/types/member';

export interface RegisterResponse {
  member: {
    id: number;
    full_name: string;
    email: string;
    role: 'member' | 'admin' | 'superuser';
  };
  token: string;
}

export interface LoginResponse {
  member: {
    id: number;
    full_name: string;
    email: string;
    role: 'member' | 'admin' | 'superuser';
  };
  token: string;
}

export interface RegisterResponse {
  message: string;
  member_id?: number;
  status: 'pending';
}

const API_URL = 'http://localhost:3000/api'; // Adjust this URL as needed

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface LoginResponse {
  member: {
    id: number;
    full_name: string;
    email: string;
    role: 'member' | 'admin' | 'superuser';
  };
  token: string;
}

export const login = async (full_name: string, password: string): Promise<LoginResponse> => {
  try {
    const response = await api.post<LoginResponse>('/auth/login', { full_name, password });
    return response.data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

// Use Member type in register function
export const register = async (registerData: Omit<Member, 'member_id' | 'total_hours'>): Promise<RegisterResponse> => {
  try {
    const response = await api.post<RegisterResponse>('/auth/register', registerData);
    return response.data;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

export const searchMembers = async (searchTerm: string) => {
  const response = await api.get(`/auth/search-members?searchTerm=${encodeURIComponent(searchTerm)}`);
  return response.data;
};

// Add more API functions here as needed

export default api;