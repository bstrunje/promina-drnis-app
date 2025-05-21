// features/systemAdmin/systemAdminApi.ts
import axios, { AxiosError } from 'axios';
import { API_BASE_URL } from '../../../utils/config';
import { SystemAdmin, SystemAdminLoginData, AdminPermissionsModel, MemberWithPermissions, UpdateMemberPermissionsDto } from '@shared/systemAdmin';
import { SystemSettings } from '@shared/settings';
import { Member } from '@shared/member';

// Definicija odgovora nakon prijave
export interface SystemAdminLoginResponse {
  admin: {
    id: number;
    username: string;
    display_name: string;
  };
  token: string;
}

// Tipovi za praćenje zdravlja sustava
export type SystemHealthStatus = 'Healthy' | 'Warning' | 'Critical';

// Informacije o stanju sustava
export interface SystemHealthInfo {
  status: SystemHealthStatus;
  dbConnection: boolean;
  diskSpace: {
    available: number;
    total: number;
    percentUsed: number;
  };
  memory: {
    available: number;
    total: number;
    percentUsed: number;
  };
  uptime: number; // vrijeme rada servera u sekundama
  lastCheck: Date;
}

// Informacije o sigurnosnoj kopiji
export interface BackupInfo {
  lastBackup: Date | null;
  backupSize: number | null;
  backupLocation: string | null;
  status: 'Success' | 'Failed' | 'Never' | 'Unknown';
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
  healthDetails?: SystemHealthInfo;
  backupDetails?: BackupInfo;
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
 * Dohvat svih članova koji nemaju administratorske ovlasti
 */
export const getMembersWithoutPermissions = async (): Promise<Member[]> => {
  try {
    const response = await systemAdminApi.get<Member[]>('/system-admin/members-without-permissions');
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.message);
    }
    throw new Error('Dogodila se greška prilikom dohvata članova bez ovlasti.');
  }
};

/**
 * Dohvat ovlasti za konkretnog člana
 */
/**
 * Tip za člana sa statusom 'pending'
 */
export interface PendingMember {
  member_id: number;
  first_name: string;
  last_name: string;
  full_name?: string;
  email: string;
  status: string;
  created_at: string;
  registration_completed?: boolean;
}

/**
 * Dohvat svih članova sa statusom 'pending'
 */
export const getPendingMembers = async (): Promise<PendingMember[]> => {
  try {
    const response = await systemAdminApi.get<PendingMember[]>('/system-admin/pending-members');
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.message);
    }
    throw new Error('Dogodila se greška.');
  }
};

/**
 * Tip odgovora za dodjeljivanje lozinke
 */
export interface PasswordAssignmentResponse {
  message: string;
}

/**
 * Dodjeljivanje lozinke članu (aktivacija računa)
 */
export const assignPasswordToMember = async (memberId: number, password: string): Promise<PasswordAssignmentResponse> => {
  try {
    const response = await systemAdminApi.post<PasswordAssignmentResponse>('/system-admin/assign-password', {
      memberId,
      password
    });
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.message);
    }
    throw new Error('Dogodila se greška prilikom dodjeljivanja lozinke.');
  }
};

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
    // Osiguravamo da objekt ima točno traženi format (member_id i permissions kao zasebna polja na root razini)
    const formattedData = {
      member_id: updateData.member_id,
      permissions: updateData.permissions
    };
    
    console.log('Sending update data:', JSON.stringify(formattedData, null, 2));
    await systemAdminApi.post('/system-admin/update-permissions', formattedData);
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
