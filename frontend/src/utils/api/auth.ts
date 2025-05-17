import api from './config';
import { ApiLoginResponse, ApiRegisterResponse } from './types';
import { MemberLoginData, Member } from '../../../shared/types/member.js';
import { AxiosResponse } from 'axios';

/**
 * Prijava korisnika
 * @param credentials Podaci za prijavu (email, password)
 * @returns Podaci o prijavljenom korisniku i token
 */
export const login = async ({ email, password }: MemberLoginData): Promise<ApiLoginResponse> => {
  try {
    // Šalje se email umjesto full_name
    const response: AxiosResponse<ApiLoginResponse> = await api.post<ApiLoginResponse>('/auth/login', { email, password });
    // Spremanje role ostaje isto
    if (response.data.member.role) {
      localStorage.setItem('userRole', response.data.member.role);
    }
    return response.data;
  } catch (error) {
    // Ovdje će se vjerojatno vratiti greška s backenda ako on i dalje očekuje full_name
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Login failed. Please check your credentials.');
  }
};

/**
 * Registracija novog člana
 * @param registerData Podaci za registraciju
 * @returns Informacije o uspješnosti registracije
 */
export const register = async (registerData: Omit<Member, 'member_id' | 'total_hours'>): Promise<ApiRegisterResponse> => {
  try {
    const response: AxiosResponse<ApiRegisterResponse> = await api.post<ApiRegisterResponse>('/auth/register', registerData);
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Registration failed. Please try again.');
  }
};

/**
 * Pretraživanje članova
 * @param searchTerm Pojam za pretragu
 * @returns Lista pronađenih članova
 */
export const searchMembers = async (searchTerm: string): Promise<Member[]> => {
  try {
    const response: AxiosResponse<Member[]> = await api.get(`/auth/search-members?searchTerm=${encodeURIComponent(searchTerm)}`);
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Member search failed');
  }
};

/**
 * Dodjeljivanje lozinke članu
 * @param memberId ID člana
 * @param password Nova lozinka
 * @param cardNumber Broj iskaznice
 */
export const assignPassword = async (memberId: number, password: string, cardNumber: string): Promise<void> => {
  try {
    interface AssignPasswordResponse {
      success: boolean;
      message: string;
    }
    await api.post<AssignPasswordResponse>('/members/assign-password', { memberId, password, cardNumber });
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to assign password');
  }
};
