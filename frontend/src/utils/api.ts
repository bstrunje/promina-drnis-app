import axios from 'axios';

export interface RegisterResponse {
  user: {
    id: number;
    username: string;
    email: string;
    role: string;
  };
  token: string;
}

const API_URL = 'http://localhost:3000/api'; // Adjust this URL as needed

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface LoginResponse {
  user: {
    id: number;
    username: string;
    email: string;
    role: 'member' | 'admin' | 'superuser';
  };
  token: string;
}

export const login = async (username: string, password: string): Promise<LoginResponse> => {
  console.log('Sending login request for username:', username);
  try {
    const response = await api.post<LoginResponse>('/auth/login', { username, password });
    console.log('Login response received:', response.data);
    return response.data;
  } catch (error: unknown) {
    console.error('Login request failed:', error);
    if (error && typeof error === 'object' && 'response' in error) {
      console.log('Error response:', (error as any).response?.data);
    }
    throw error;
  }
};

export const register = async (registerData: {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<RegisterResponse> => {
  const response = await api.post<RegisterResponse>('/auth/register', registerData);
  return response.data;
};

// Add more API functions here as needed

export default api;