// features/systemAdmin/systemAdminApi.ts
import axios, { AxiosError } from 'axios';
import { API_BASE_URL } from '../../utils/config';
import { SystemAdmin, SystemAdminLoginData, AdminPermissionsModel, MemberWithPermissions, UpdateMemberPermissionsDto } from '@shared/systemAdmin';
import { SystemSettings } from '@shared/settings';

// Definicija odgovora nakon prijave
export interface SystemAdminLoginResponse {
  admin: {
    id: number;
    username: string;
    display_name: string;
  };
  token: string;
}

// Definicija statistika dashboarda
export interface SystemAdminDashboardStats {
  totalMembers: number;
  registeredMembers: number;
  activeMembers: number;
  pendingApprovals: number;
  recentActivities: number;
  systemHealth: string;
  lastBackup: string;
}

// Kreiranje instance axios-a s osnovnim postavkama
const systemAdminApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor za dodavanje tokena u zahtjeve
systemAdminApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('systemAdminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => {
    // Provjeri je li error tipa AxiosError
    if (axios.isAxiosError(error)) {
      return Promise.reject(new Error(error.message));
    }
    return Promise.reject(new Error('Dogodila se greška.'));
  }
);

// Interceptor za obradu odgovora
systemAdminApi.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const isLoginRequest = error.config?.url?.includes('/system-admin/login');
    
    // Ako je greška 401 ali NIJE login zahtjev (istek sesije)
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('systemAdminToken');
      localStorage.removeItem('systemAdmin');
      window.location.href = '/system-admin/login';
      return Promise.reject(new Error('Sesija je istekla. Molimo, prijavite se ponovno.'));
    }
    
    // Provjeri je li error tipa AxiosError
    if (axios.isAxiosError(error)) {
      return Promise.reject(new Error(error.message));
    }
    return Promise.reject(new Error('Dogodila se greška.'));
  }
);



// API funkcije za System Admin

/**
 * Prijava system admina
 */
export const systemAdminLogin = async ({ username, password }: SystemAdminLoginData): Promise<SystemAdminLoginResponse> => {
  try {
    const response = await systemAdminApi.post<SystemAdminLoginResponse>('/system-admin/login', { 
      username, 
      password 
    });
    
    // Spremanje ID-a i tokena u localStorage
    localStorage.setItem('systemAdminToken', response.data.token);
    localStorage.setItem('systemAdmin', JSON.stringify(response.data.admin));
    
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.message);
    }
    throw new Error('Dogodila se greška.');
  }
};

/**
 * Odjava system admina
 * @returns {boolean} Uspješnost odjave
 */
export const systemAdminLogout = (): boolean => {
  try {
    console.log('Čišćenje lokalnih podataka za system admina');
    localStorage.removeItem('systemAdminToken');
    localStorage.removeItem('systemAdmin');
    
    // Čišćenje kolačića na klijentskoj strani kao sigurnosna mjera
    document.cookie = "refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    
    // Ako smo u produkciji, dodajemo secure i SameSite atribute
    if (process.env.NODE_ENV === 'production' || window.location.protocol === 'https:') {
      document.cookie = "refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; SameSite=None;";
    }
    
    // Ne preusmjeravamo ovdje, prepuštamo to komponenti koja poziva ovu funkciju
    return true;
  } catch (error: unknown) {
    console.error('Greška pri odjavi system admina:', error);
    return false;
  }
};

/**
 * Provjera postoji li u sustavu system admin
 */
export const checkSystemAdminExists = async (): Promise<boolean> => {
  try {
    const response = await systemAdminApi.get<{ exists: boolean }>('/system-admin/exists');
    return response.data.exists;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.message);
    }
    throw new Error('Dogodila se greška.');
  }
};

/**
 * Dohvat članova s admin ovlastima
 */
export const getMembersWithPermissions = async (): Promise<MemberWithPermissions[]> => {
  try {
    const response = await systemAdminApi.get<MemberWithPermissions[]>('/system-admin/members-with-permissions');
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.message);
    }
    throw new Error('Dogodila se greška.');
  }
};

/**
 * Dohvat ovlasti za konkretnog člana
 */
export const getMemberPermissions = async (memberId: number): Promise<AdminPermissionsModel | null> => {
  try {
    const response = await systemAdminApi.get<AdminPermissionsModel>(`/system-admin/member-permissions/${memberId}`);
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null; // Član nema ovlasti
    }
    if (axios.isAxiosError(error)) {
      throw new Error(error.message);
    }
    throw new Error('Dogodila se greška.');
  }
};

/**
 * Ažuriranje ovlasti za člana
 */
export const updateMemberPermissions = async (updateData: UpdateMemberPermissionsDto): Promise<void> => {
  try {
    await systemAdminApi.post('/system-admin/update-permissions', updateData);
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.message);
    }
    throw new Error('Dogodila se greška.');
  }
};

/**
 * Uklanjanje svih ovlasti za člana
 */
export const removeMemberPermissions = async (memberId: number): Promise<void> => {
  try {
    await systemAdminApi.delete(`/system-admin/remove-permissions/${memberId}`);
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.message);
    }
    throw new Error('Dogodila se greška.');
  }
};

/**
 * Dohvat svih system admina
 */
export const getAllSystemAdmins = async (): Promise<SystemAdmin[]> => {
  try {
    const response = await systemAdminApi.get<SystemAdmin[]>('/system-admin');
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.message);
    }
    throw new Error('Dogodila se greška.');
  }
};

/**
 * Kreiranje novog system admina
 */
export const createSystemAdmin = async (adminData: { 
  username: string; 
  email: string; 
  password: string;
  display_name: string; 
}): Promise<SystemAdmin> => {
  try {
    const response = await systemAdminApi.post<{ admin: SystemAdmin, message: string }>('/system-admin/create', adminData);
    return response.data.admin;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.message);
    }
    throw new Error('Dogodila se greška.');
  }
};

/**
 * Dohvat statistika za system admin dashboard
 */
export const getSystemAdminDashboardStats = async (): Promise<SystemAdminDashboardStats> => {
  try {
    const response = await systemAdminApi.get<SystemAdminDashboardStats>('/system-admin/dashboard/stats');
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.message);
    }
    throw new Error('Dogodila se greška.');
  }
};

/**
 * Ažuriranje postavki sustava
 * @param settings Novi podaci za postavke sustava
 * @returns Ažurirane postavke sustava
 */
export const updateSystemSettings = async (settings: SystemSettings): Promise<SystemSettings> => {
  try {
    const response = await systemAdminApi.put<SystemSettings>('/system-admin/settings', settings);
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.message);
    }
    throw new Error('Dogodila se greška.');
  }
};

export default systemAdminApi;
