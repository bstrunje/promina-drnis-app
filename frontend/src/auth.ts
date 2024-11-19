// src/auth.ts
import api from './utils/api';

export interface RegisterResponse {
  user: {
    id: number;
    username: string;
    email: string;
    role: 'member' | 'admin' | 'superuser';
  };
  token: string;
}

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