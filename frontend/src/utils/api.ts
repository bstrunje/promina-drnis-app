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

export const updateMembership = async (memberId: number, data: {
  paymentDate: string;
  cardNumber: string;
  stampIssued: boolean;
}) => {
  const response = await fetch(`${API_URL}/members/${memberId}/membership`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error('Failed to update membership');
  }
};

export const terminateMembership = async (memberId: number, reason: string) => {
  const response = await fetch(`${API_URL}/members/${memberId}/membership/terminate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      reason,
      endDate: new Date().toISOString()
    })
  });

  if (!response.ok) {
    throw new Error('Failed to terminate membership');
  }
};

export const uploadProfileImage = async (memberId: number, imageFile: File): Promise<string> => {
  const formData = new FormData();
  formData.append('image', imageFile);

  const response = await fetch(`${API_URL}/members/${memberId}/profile-image`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error('Failed to upload image');
  }

  const data = await response.json();
  return data.imagePath;
};

export const sendMemberMessage = async (memberId: number, messageText: string): Promise<void> => {
  const response = await fetch(`${API_URL}/members/${memberId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ messageText })
  });

  if (!response.ok) {
    throw new Error('Failed to send message');
  }
};

interface MemberActivity {
  activity_id: number;
  title: string;
  date: string;
  hours_spent: number;
}

export const getMemberActivities = async (memberId: number): Promise<MemberActivity[]> => {
  const response = await fetch(`${API_URL}/members/${memberId}/activities`, {
      headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
  });
  if (!response.ok) {
      throw new Error('Failed to fetch member activities');
  }
  return response.json();
};

// Add more API functions here as needed

export default api;