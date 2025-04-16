import axios, { AxiosError } from 'axios';
import { Member, MemberLoginData, MemberSearchResult } from '../../shared/types/member.js';
import { AuditLog } from '../../shared/types/audit.js';
import { API_BASE_URL } from './config';

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

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for API calls
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for API calls
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(new Error('Session expired. Please login again.'));
    }
    return Promise.reject(error);
  }
);

// Centralized error handler
const handleApiError = (error: unknown, defaultMessage: string): never => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message || defaultMessage;
    throw new Error(message);
  }
  throw new Error(defaultMessage);
};

// Authentication APIs
export const login = async ({ full_name, password }: MemberLoginData): Promise<LoginResponse> => {
  try {
    const response = await api.post<LoginResponse>('/auth/login', { full_name, password });
    localStorage.setItem('userRole', response.data.member.role);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Login failed. Please check your credentials.');
  }
};

export const register = async (registerData: Omit<Member, 'member_id' | 'total_hours'>): Promise<RegisterResponse> => {
  try {
    const response = await api.post<RegisterResponse>('/auth/register', registerData);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Registration failed. Please try again.');
  }
};

export const searchMembers = async (searchTerm: string): Promise<MemberSearchResult[]> => {
  try {
    const response = await api.get(`/auth/search-members?searchTerm=${encodeURIComponent(searchTerm)}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Member search failed');
  }
};

export const assignPassword = async (memberId: number, password: string, cardNumber: string): Promise<void> => {
  try {
    await api.post('/members/assign-password', { memberId, password, cardNumber });
  } catch (error) {
    throw handleApiError(error, 'Failed to assign password');
  }
};

// Membership APIs

// Update the interface for the membership update parameters
interface MembershipUpdateParams {
  paymentDate?: string;
  cardNumber?: string;
  stampIssued?: boolean;
  isRenewalPayment?: boolean; // Add this property to fix the type error
}

export const updateMembership = async (
  memberId: number, 
  data: MembershipUpdateParams
): Promise<any> => {
  try {
    const response = await api.post(
      `/members/${memberId}/membership`,
      data,
      {
        timeout: 30000, // Increase timeout to 30 seconds
        headers: {
          'Content-Type': 'application/json'
        },
        // Add retry logic
        validateStatus: (status) => {
          return status >= 200 && status < 300;
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('updateMembership detailed error:', {
      error,
      request: error?.request,
      response: error?.response,
      config: error?.config
    });
    
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message;
      throw new Error(`Failed to update membership: ${message}`);
    }
    throw error;
  }
};

export const terminateMembership = async (memberId: number, reason: string) => {
  try {
    const response = await api.post(`/members/${memberId}/membership/terminate`, { 
      reason, 
      endDate: new Date().toISOString(), 
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to terminate membership');
  }
};

// Profile and Activities APIs
export const uploadProfileImage = async (memberId: number, imageFile: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('image', imageFile);
    const response = await api.post(`/members/${memberId}/profile-image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.imagePath;
  } catch (error) {
    throw handleApiError(error, 'Failed to upload image');
  }
};

export const getMemberActivities = async (memberId: number) => {
  try {
    const response = await api.get(`/members/${memberId}/activities`);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch member activities');
  }
};

// Message APIs
export const getAdminMessages = async () => {
  try {
    const response = await api.get('/messages/admin');
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch messages');
  }
};

export const sendMemberMessage = async (memberId: number, messageText: string): Promise<void> => {
  try {
    await api.post(`/members/${memberId}/messages`, { messageText });
  } catch (error) {
    throw handleApiError(error, 'Failed to send message');
  }
};

export const markMessageAsRead = async (messageId: number): Promise<void> => {
  try {
    await api.put(`/messages/${messageId}/read`);
  } catch (error) {
    throw handleApiError(error, 'Failed to mark message as read');
  }
};

export const archiveMessage = async (messageId: number): Promise<void> => {
  try {
    await api.put(`/messages/${messageId}/archive`);
  } catch (error) {
    throw handleApiError(error, 'Failed to archive message');
  }
};

export const deleteMessage = async (messageId: number): Promise<void> => {
  try {
    await api.delete(`/messages/${messageId}`);
  } catch (error) {
    throw handleApiError(error, 'Failed to delete message');
  }
};

export const deleteAllMessages = async (): Promise<void> => {
  try {
    await api.delete('/messages');
  } catch (error) {
    throw handleApiError(error, 'Failed to delete all messages');
  }
};

// Audit APIs
export const getAuditLogs = async (): Promise<AuditLog[]> => {
  try {
    const response = await api.get('/audit/logs');
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch audit logs');
  }
};

// Settings APIs
export const getCardNumberLength = async (): Promise<number> => {
  try {
    const response = await api.get('/settings/card-length');
    return response.data.cardNumberLength;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch card number length setting');
  }
};

export const updateCardNumberLength = async (length: number): Promise<void> => {
  try {
    await api.put('/settings/card-length', { length });
  } catch (error) {
    throw handleApiError(error, 'Failed to update card number length');
  }
};

// Card Number APIs
export const getAvailableCardNumbers = async (): Promise<string[]> => {
  try {
    const response = await api.get('/card-numbers/available');
    return response.data;
  } catch (error) {
    console.error("API: Error fetching card numbers:", error);
    throw handleApiError(error, 'Failed to fetch available card numbers');
  }
};

export const addCardNumber = async (cardNumber: string): Promise<void> => {
  try {
    await api.post('/card-numbers/add', { cardNumber });
  } catch (error) {
    throw handleApiError(error, 'Failed to add card number');
  }
};

export const addCardNumberRange = async (start: number, end: number): Promise<void> => {
  try {
    await api.post('/card-numbers/add-range', { start, end });
  } catch (error) {
    throw handleApiError(error, 'Failed to add card number range');
  }
};

// Add this function to get all card numbers
export const getAllCardNumbers = async (): Promise<{ 
  cards: Array<{
    card_number: string; 
    status: 'available' | 'assigned' | 'retired';
    member_id?: number;
    member_name?: string;
  }>,
  stats: {
    total: number;
    available: number;
    assigned: number;
  }
}> => {
  try {
    const response = await api.get('/card-numbers/all');
    return response.data;
  } catch (error) {
    console.error("API: Error fetching card numbers:", error);
    throw handleApiError(error, 'Failed to fetch card numbers');
  }
};

// Make sure the deleteCardNumber function returns properly
export const deleteCardNumber = async (cardNumber: string): Promise<{ message: string, cardNumber: string }> => {
  try {
    const response = await api.delete(`/card-numbers/${cardNumber}`);
    return response.data;
  } catch (error) {
    console.error('API error deleting card number:', error);
    throw handleApiError(error, 'Failed to delete card number');
  }
};

export default api;