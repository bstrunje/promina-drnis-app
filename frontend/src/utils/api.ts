// frontend/src/utils/api.ts
import axios, { InternalAxiosRequestConfig } from 'axios';
import { Member, MemberLoginData, MemberSearchResult } from '@shared/types/member';
import { AuditLog } from '@promina-drnis-app/shared/types/audit';

export interface LoginResponse {
  member: {
    id: number;
    full_name: string;
    role: Member['role'];
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

// Add a request interceptor
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const getAuditLogs = async (): Promise<AuditLog[]> => {
  const response = await api.get('/audit/logs');
  return response.data;
};

export const login = async ({ full_name, password }: MemberLoginData): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>('/auth/login', { full_name, password });
  console.log('User data from API:', response.data);
  localStorage.setItem('userRole', response.data.member.role);
  return response.data;
};

export const register = async (registerData: Omit<Member, 'member_id' | 'total_hours'>): Promise<RegisterResponse> => {
  try {
    const response = await api.post<RegisterResponse>('/auth/register', registerData);
    return response.data;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

export const searchMembers = async (searchTerm: string): Promise<MemberSearchResult[]> => {
  const response = await api.get(`/auth/search-members?searchTerm=${encodeURIComponent(searchTerm)}`);
  return response.data;
};

export const assignPassword = async (memberId: number, password: string): Promise<void> => {
  console.log('Assigning password for member ID:', memberId);
    console.log('Assigning password to URL:', `${api.defaults.baseURL}/members/assign-password`);
  try {
  await api.post('/members/assign-password', { memberId, password });
  console.log('Assigning password for member ID:', memberId);
  } catch (error) {
    console.error('Password assignment error:', error);
    throw error;
  }
};

// Add more API functions here as needed

export default api;