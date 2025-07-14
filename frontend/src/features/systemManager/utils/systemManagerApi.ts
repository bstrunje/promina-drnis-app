// features/systemManager/systemManagerApi.ts
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../../../utils/config';
import { SystemManager, SystemManagerLoginData, AdminPermissionsModel, MemberWithPermissions, UpdateMemberPermissionsDto, SystemManagerLoginResponse } from '@shared/systemManager';
import { SystemSettings } from '@shared/settings';
import { Member } from '@shared/member';
import { navigateToSystemManagerPath } from '../hooks/useSystemManagerNavigation';

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
export interface SystemManagerDashboardStats {
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
const systemManagerApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Omogućuje slanje i primanje kolačića u cross-origin zahtjevima
});

// Interceptor za dodavanje tokena u zahtjeve
systemManagerApi.interceptors.request.use(
  (config) => {
    // Eksplicitno koristimo samo systemManagerToken za System Manager API zahtjeve
    // a ne regularni member token koji se također može nalaziti u localStorage
    const systemManagerToken = localStorage.getItem('systemManagerToken');
    
    if (systemManagerToken) {
      config.headers.Authorization = `Bearer ${systemManagerToken}`;
      // Dodatno logiranje u development modu
      if (process.env.NODE_ENV === 'development') {
        // console.log('System Manager API koristi token:', systemManagerToken.substring(0, 15) + '...');
      }
    } else {
      // Upozorenje ako nedostaje System Manager token
      console.warn('System Manager API pozvan bez System Manager tokena!');
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

// Pratimo jesmo li već u procesu osvježavanja tokena kako bismo izbjegli beskonačnu petlju
let isRefreshing = false;
// Red čekajućih zahtjeva koji čekaju na osvježavanje tokena
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  config: AxiosRequestConfig;
}> = [];

// Funkcija za procesiranje reda zahtjeva nakon osvježavanja tokena
const processQueue = (error: unknown | null, token: string | null = null) => {
  failedQueue.forEach(promise => {
    if (error) {
      promise.reject(error);
    } else {
      // Dodaj novi token u zahtjev
      if (token && promise.config.headers) {
        promise.config.headers['Authorization'] = `Bearer ${token}`;
      }
      promise.resolve(systemManagerApi(promise.config));
    }
  });
  
  // Očisti red
  failedQueue = [];
};

// Interceptor za obradu odgovora
systemManagerApi.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    
    // Ako nema originalnog zahtjeva, odmah odbaci
    if (!originalRequest) {
      return Promise.reject(error);
    }
    
    // Provjeri je li greška 401 (Unauthorized) i nije zahtjev za login ili refresh token
    const isLoginRequest = originalRequest.url?.includes('/system-manager/login');
    const isRefreshRequest = originalRequest.url?.includes('/system-manager/refresh-token');
    
    // Ako je greška 401 i nije login ili refresh zahtjev i nismo već u procesu osvježavanja
    if (error.response?.status === 401 && !isLoginRequest && !isRefreshRequest && !isRefreshing) {
      // Označi da smo u procesu osvježavanja tokena
      isRefreshing = true;
      
      // Pokušaj osvježiti token
      try {
        // Poziv funkcije za osvježavanje tokena
        const response = await systemManagerRefreshToken();
        const newToken = response.token;
        
        // Postavi novi token u header originalnog zahtjeva
        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        }
        
        // Procesiraj red čekajućih zahtjeva s novim tokenom
        processQueue(null, newToken);
        
        // Ponovno pošalji originalni zahtjev s novim tokenom
        return systemManagerApi(originalRequest);
      } catch (refreshError) {
        // Ako osvježavanje nije uspjelo, odbaci sve zahtjeve u redu
        processQueue(refreshError, null);
        
        // Čišćenje lokalnog stanja
        localStorage.removeItem('systemManagerToken');
        localStorage.removeItem('systemManager');
        
        // Preusmjeri na login stranicu
        navigateToSystemManagerPath('/system-manager/login', { replace: true });
        return Promise.reject(new Error('Sesija je istekla. Molimo, prijavite se ponovno.'));
      } finally {
        // Resetiraj zastavicu
        isRefreshing = false;
      }
    }
    
    // Ako je greška 401 i već smo u procesu osvježavanja, dodaj zahtjev u red
    if (error.response?.status === 401 && !isLoginRequest && !isRefreshRequest && isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve,
          reject,
          config: originalRequest
        });
      });
    }
    
    // Provjeri je li error tipa AxiosError
    if (axios.isAxiosError(error)) {
      return Promise.reject(new Error(error.message));
    }
    return Promise.reject(new Error('Dogodila se greška.'));
  }
);



// API funkcije za System Manager

/**
 * Prijava system managera
 */
export const systemManagerLogin = async ({ username, password }: SystemManagerLoginData): Promise<SystemManagerLoginResponse> => {
  try {
    const response = await systemManagerApi.post<SystemManagerLoginResponse>('/system-manager/login', { 
      username, 
      password 
    });
    
    // Čišćenje tokena običnog člana kako bi se izbjegao konflikt
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    localStorage.removeItem('refreshToken');
    // console.log('Uklonjeni tokeni regularnog člana prilikom prijave kao System Manager');
    
    // Spremanje ID-a i tokena System Manager u localStorage
    localStorage.setItem('systemManagerToken', response.data.token);
    localStorage.setItem('systemManager', JSON.stringify(response.data.manager));
    
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.message);
    }
    throw new Error('Dogodila se greška.');
  }
};

/**
 * Osvježavanje tokena system managera
 * @returns {Promise<SystemManagerLoginResponse>} Novi token i podaci o manageru
 */
export const systemManagerRefreshToken = async (): Promise<SystemManagerLoginResponse> => {
  try {
    // console.log('Pokušavam osvježiti System Manager token...');
    
    // Poziv na backend endpoint za osvježavanje tokena
    // Kolačić s refresh tokenom će biti automatski poslan zbog withCredentials: true
    const response = await systemManagerApi.post<SystemManagerLoginResponse>('/system-manager/refresh-token');
    
    // Spremanje novog tokena u localStorage
    localStorage.setItem('systemManagerToken', response.data.token);
    localStorage.setItem('systemManager', JSON.stringify(response.data.manager));
    
    // console.log('System Manager token uspješno osvježen');
    return response.data;
  } catch (error: unknown) {
    console.error('Greška prilikom osvježavanja tokena:', error);
    // U slučaju greške, čistimo tokene
    localStorage.removeItem('systemManagerToken');
    localStorage.removeItem('systemManager');
    throw error;
  }
};

/**
 * Odjava system managera
 * @returns {boolean} Uspješnost odjave
 */
export const systemManagerLogout = async (): Promise<boolean> => {
  try {
    // console.log('Započinjem proces odjave System Managera...');
    
    // Poziv na backend za odjavu i poništavanje refresh tokena
    await systemManagerApi.post('/system-manager/logout');
    // console.log('Uspješno poslan zahtjev za odjavu na backend');
    
    // Čišćenje System Manager tokena iz localStorage-a
    localStorage.removeItem('systemManagerToken');
    localStorage.removeItem('systemManager');
    
    // Čišćenje zastarjelih tokena iz lokalnog spremišta
    localStorage.removeItem('systemAdmin'); // Zastarjeli naziv
    localStorage.removeItem('systemAdminToken'); // Zastarjeli naziv
    
    // console.log('Uklonjeni System Manager tokeni i zastarjeli tokeni iz lokalnog spremišta');
    
    // Čišćenje kolačića na klijentskoj strani kao dodatna sigurnosna mjera
    // iako bi backend trebao obrisati kolačiće kroz Set-Cookie zaglavlje
    const isSecure = process.env.NODE_ENV === 'production' || window.location.protocol === 'https:';
    
    // Osnovne postavke za brisanje kolačića
    document.cookie = "systemManagerRefreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/api/system-manager;";
    document.cookie = "refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/api/auth;";
    
    // Ako smo u produkciji ili koristimo HTTPS, dodajemo secure i SameSite atribute
    if (isSecure) {
      document.cookie = "systemManagerRefreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/api/system-manager; secure; SameSite=None;";
      document.cookie = "refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/api/auth; secure; SameSite=None;";
    }
    
    // console.log('System Manager uspješno odjavljen');
    // Ne preusmjeravamo ovdje, prepuštamo to komponenti koja poziva ovu funkciju
    return true;
  } catch (error: unknown) {
    console.error('Greška pri odjavi System Managera:', error);
    return false;
  }
};

/**
 * Provjera postoji li u sustavu system manager
 */
export const checkSystemManagerExists = async (): Promise<boolean> => {
  try {
    const response = await systemManagerApi.get<{ exists: boolean }>('/system-manager/exists');
    return response.data.exists;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.message);
    }
    throw new Error('Dogodila se greška.');
  }
};

/**
 * Dohvat članova s manager ovlastima
 */
export const getMembersWithPermissions = async (): Promise<MemberWithPermissions[]> => {
  try {
    const response = await systemManagerApi.get<MemberWithPermissions[]>('/system-manager/members-with-permissions');
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.message);
    }
    throw new Error('Dogodila se greška.');
  }
};

/**
 * Dohvat svih članova koji nemaju manageristratorske ovlasti
 */
export const getMembersWithoutPermissions = async (): Promise<Member[]> => {
  try {
    const response = await systemManagerApi.get<Member[]>('/system-manager/members-without-permissions');
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
    const response = await systemManagerApi.get<PendingMember[]>('/system-manager/pending-members');
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
    const response = await systemManagerApi.post<PasswordAssignmentResponse>('/system-manager/assign-password', {
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

/**
 * Dodjeljivanje uloge članu (member_superuser)
 */
export const assignRoleToMember = async (memberId: number, role: 'member' | 'member_administrator' | 'member_superuser'): Promise<void> => {
  try {
    await systemManagerApi.post('/system-manager/assign-role', {
      memberId,
      role
    });
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.message);
    }
    throw new Error('Dogodila se greška prilikom dodjeljivanja uloge.');
  }
};

export const getMemberPermissions = async (memberId: number): Promise<AdminPermissionsModel | null> => {
  try {
    const response = await systemManagerApi.get<AdminPermissionsModel>(`/system-manager/member-permissions/${memberId}`);
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
    
    // console.log('Sending update data:', JSON.stringify(formattedData, null, 2));
    await systemManagerApi.post('/system-manager/update-permissions', formattedData);
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
    await systemManagerApi.delete(`/system-manager/remove-permissions/${memberId}`);
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.message);
    }
    throw new Error('Dogodila se greška.');
  }
};

/**
 * Dohvat svih system managera
 */
export const getAllSystemManager = async (): Promise<SystemManager[]> => {
  try {
    const response = await systemManagerApi.get<SystemManager[]>('/system-manager/all');
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.message);
    }
    throw new Error('Dogodila se greška.');
  }
};

/**
 * Kreiranje novog system managera
 */
export const createSystemManager = async (managerData: { 
  username: string; 
  email: string; 
  password: string;
  display_name: string; 
}): Promise<SystemManager> => {
  try {
    const response = await systemManagerApi.post<{ manager: SystemManager, message: string }>('/system-manager/create', managerData);
    return response.data.manager;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.message);
    }
    throw new Error('Dogodila se greška.');
  }
};

/**
 * Dohvat statistika za system manager dashboard
 */
export const getSystemManagerDashboardStats = async (): Promise<SystemManagerDashboardStats> => {
  try {
    const response = await systemManagerApi.get<SystemManagerDashboardStats>('/system-manager/dashboard/stats');
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
    // console.log('Šaljem PUT zahtjev na:', `${API_BASE_URL}/system-manager/settings`);
    // console.log('Podaci:', settings);
    const response = await systemManagerApi.put<SystemSettings>('/system-manager/settings', settings);
    // console.log('Odgovor:', response.data);
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error('AxiosError:', error.response?.data);
      console.error('Status:', error.response?.status);
      console.error('Headers:', error.response?.headers);
      throw new Error(error.response?.data?.message || error.message);
    }
    console.error('Nepoznata greška:', error);
    throw new Error('Dogodila se greška.');
  }
};

export default systemManagerApi;
