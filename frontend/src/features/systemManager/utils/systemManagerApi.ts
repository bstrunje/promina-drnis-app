// features/systemManager/systemManagerApi.ts
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../../../utils/config';
import { SystemManager, SystemManagerLoginData, AdminPermissionsModel, MemberWithPermissions, UpdateMemberPermissionsDto, SystemManagerLoginResponse } from '@shared/systemManager';
import { SystemSettings } from '@shared/settings';

// Re-export tipova za lakši pristup u komponentama
export type { SystemManager, SystemManagerLoginData, AdminPermissionsModel, MemberWithPermissions, UpdateMemberPermissionsDto, SystemManagerLoginResponse };

// Tipovi za 2FA i force password change flow
export interface Verify2faResponse {
  resetRequired?: boolean;
  tempToken?: string;
  token?: string;
  manager?: SystemManager;
}

export interface ChangePasswordResponse {
  token: string;
  manager: SystemManager;
}
import { Member } from '@shared/member';

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

// Activity tip za recent activities
export interface DashboardActivity {
  activity_id: string | number;
  name: string;
  activity_type: {
    name: string;
  };
  participants: {
    id: string | number;
    name: string;
  }[];
  start_date: string | Date;
}

// Definicija statistika dashboarda
export interface SystemManagerDashboardStats {
  totalMembers: number;
  registeredMembers: number;
  activeMembers: number;
  pendingApprovals: number;
  recentActivities: number;
  recentActivitiesList: DashboardActivity[];
  systemHealth: string;
  lastBackup: string;
  healthDetails: SystemHealthInfo;
  backupDetails: BackupInfo;
  pendingRegistrations?: number;
  systemSettings?: SystemSettings;
}

// Kreiranje instance axios-a s osnovnim postavkama
const systemManagerApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Omogućuje slanje i primanje kolačića u cross-origin zahtjevima
});

/**
 * Ekstraktuje org slug iz trenutnog URL-a
 * - /system-manager/... → null (Global SM)
 * - /promina/system-manager/... → 'promina' (Org SM)
 */
const extractOrgSlugFromPath = (): string | null => {
  const pathname = window.location.pathname;
  const pathParts = pathname.split('/').filter(Boolean);
  
  // Ako path počinje s 'system-manager', to je Global SM
  if (pathParts[0] === 'system-manager') {
    return null;
  }
  
  // Ako drugi dio je 'system-manager', prvi je org slug
  if (pathParts[1] === 'system-manager') {
    return pathParts[0];
  }
  
  return null;
};

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
      if (import.meta.env.DEV) {
        console.warn('System Manager API pozvan bez System Manager tokena!');
      }
    }
    
    try {
      // Dohvati org slug ako postoji
      const orgSlug = extractOrgSlugFromPath();
      if (import.meta.env.DEV) {
        console.log(`[SM-API] Detected orgSlug: ${orgSlug}, current path: ${window.location.pathname}`);
      }
      
      // Propagiraj tenant/branding za sve System Manager rute
      const url = config.url ?? '';
      if (url.startsWith('/system-manager')) {
        // Svi SM pozivi idu na /api/system-manager/*
        // Org-specific SM dodaje ?tenant=orgSlug query param
        
        config.url = url; // Zadrži /system-manager/login
        // baseURL je već API_BASE_URL (http://localhost:3000/api)
        
        // MULTI-TENANCY: Dodaj tenant parametar SAMO za Organization-specific SM
        // Global SM (orgSlug === null) ne šalje tenant parametar
        if (import.meta.env.DEV) {
          console.log(`[SM-API-DEBUG] orgSlug: '${orgSlug}', isGlobalSM: ${orgSlug === null}`);
        }
        
        if (orgSlug) {
          // Organization-specific System Manager - dodaj tenant parametar
          const [path, queryStr] = config.url.split('?');
          const params = new URLSearchParams(queryStr ?? '');
          params.set('tenant', orgSlug); // Dodaj tenant param
          config.url = `${path}?${params.toString()}`;
          if (import.meta.env.DEV) {
            console.log(`[SM-API] Org SM - Adding tenant param: ${url} → ${config.baseURL}${config.url}`);
          }
        } else {
          // Global System Manager - ne dodavaj tenant parametar
          if (import.meta.env.DEV) {
            console.log(`[SM-API] Global SM - No tenant param: ${config.baseURL}${config.url}`);
          }
        }
        
        // Dodatno: propagiraj branding query parametar ako postoji
        const current = new URL(window.location.href);
        const b = current.searchParams.get('branding');
        if (b) {
          const [path, queryStr] = config.url.split('?');
          const params = new URLSearchParams(queryStr ?? '');
          if (!params.has('branding')) params.set('branding', b);
          config.url = `${path}?${params.toString()}`;
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[SM-API] Greška u interceptoru:', error);
      }
      // Ne ruši zahtjev
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
let failedQueue: {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  config: AxiosRequestConfig;
}[] = [];

// Funkcija za procesiranje reda zahtjeva nakon osvježavanja tokena
const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(promise => {
    if (error) {
      promise.reject(error);
    } else {
      // Dodaj novi token u zahtjev
      if (token && promise.config.headers) {
        promise.config.headers.Authorization = `Bearer ${token}`;
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
    const isLoginRequest = (originalRequest.url?.includes('/system-manager/login') ?? false) || (originalRequest.url?.includes('/api/system-manager/login') ?? false);
    const isRefreshRequest = (originalRequest.url?.includes('/system-manager/refresh-token') ?? false) || (originalRequest.url?.includes('/api/system-manager/refresh-token') ?? false);
    
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
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
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
        
        // Dohvati branding parametar ako postoji
        const branding = localStorage.getItem('systemManagerBranding');
        const brandingQuery = branding ? `?branding=${branding}` : '';
        
        // Preusmjeri na login stranicu korištenjem window.location (sigurnije od navigateInstance)
        // Ovo osigurava da preusmjeravanje uvijek radi, čak i ako React Router kontekst nije dostupan
        window.location.href = `${window.location.origin}/system-manager/login${brandingQuery}`;
        
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
    // Propagiraj tenant/branding iz trenutačnog URL-a prema backendu
    let loginPath = '/system-manager/login';
    try {
      const params = new URLSearchParams(window.location.search);
      const rawTenant = params.get('tenant') ?? params.get('branding');
      if (rawTenant) {
        // Ako već postoje drugi parametri, zadržavamo ih i šaljemo samo tenant/branding
        const qs = new URLSearchParams();
        const t = params.get('tenant');
        const b = params.get('branding');
        if (t) qs.set('tenant', t);
        if (b) qs.set('branding', b);
        const suffix = qs.toString();
        if (suffix) loginPath = `${loginPath}?${suffix}`;
      }
    } catch {
      // Bez prekida ako URLSearchParams nije dostupan u nekom kontekstu
    }

    const response = await systemManagerApi.post<SystemManagerLoginResponse>(loginPath, { 
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
    if (import.meta.env.DEV) {
      console.error('Greška prilikom osvježavanja tokena:', error);
    }
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
    if (import.meta.env.DEV) {
      console.error('Greška pri odjavi System Managera:', error);
    }
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
    await systemManagerApi.delete(`/system-manager/member-permissions/${memberId}`);
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
 * Dohvat postavki sustava
 */
export const getSystemSettings = async (): Promise<SystemSettings> => {
  try {
    const response = await systemManagerApi.get<SystemSettings>('/system-manager/settings');
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
    const response = await systemManagerApi.put('/system-manager/settings', settings);
    const data = response.data as unknown;
    // Backend vraća { message, settings } – vraćamo samo settings
    if (data && typeof data === 'object' && 'settings' in (data as Record<string, unknown>)) {
      return (data as { settings: SystemSettings }).settings;
    }
    // Ako backend vrati direktno objekt postavki
    return data as SystemSettings;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      if (import.meta.env.DEV) {
        console.error('AxiosError:', error.response?.data);
        console.error('Status:', error.response?.status);
        console.error('Headers:', error.response?.headers);
      }
      const respData: unknown = error.response?.data;
      let apiMessage: string | undefined;
      if (respData && typeof respData === 'object' && 'message' in (respData as Record<string, unknown>)) {
        const messageValue = (respData as Record<string, unknown>).message;
        apiMessage = typeof messageValue === 'string' ? messageValue : undefined;
      }
      throw new Error(apiMessage ?? error.message);
    }
    if (import.meta.env.DEV) {
      console.error('Nepoznata greška:', error);
    }
    throw new Error('Dogodila se greška.');
  }
};

/**
 * Dohvat svih članova (System Manager)
 */
export const getAllMembersForSystemManager = async (): Promise<Member[]> => {
  try {
    const response = await systemManagerApi.get<Member[]>('/system-manager/members');
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.message);
    }
    throw new Error('Dogodila se greška prilikom dohvata članova.');
  }
};

/**
 * Brisanje člana (System Manager)
 */
export const deleteMemberForSystemManager = async (memberId: number): Promise<{ message: string; memberId: number }> => {
  try {
    const response = await systemManagerApi.delete<{ message: string; memberId: number }>(`/system-manager/members/${memberId}`);
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.message);
    }
    throw new Error('Dogodila se greška prilikom brisanja člana.');
  }
};

/**
 * Dohvaća duty calendar settings (System Manager)
 */
export const getDutySettings = async (): Promise<{
  dutyCalendarEnabled: boolean | null;
  dutyMaxParticipants: number | null;
  dutyAutoCreateEnabled: boolean | null;
}> => {
  try {
    const response = await systemManagerApi.get<{
      dutyCalendarEnabled: boolean | null;
      dutyMaxParticipants: number | null;
      dutyAutoCreateEnabled: boolean | null;
    }>('/system-manager/duty-settings');
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.message);
    }
    throw error;
  }
};

/**
 * Ažurira duty calendar settings (System Manager)
 */
export const updateDutySettings = async (settings: {
  dutyCalendarEnabled?: boolean;
  dutyMaxParticipants?: number;
  dutyAutoCreateEnabled?: boolean;
}): Promise<{
  id: string;
  dutyCalendarEnabled: boolean | null;
  dutyMaxParticipants: number | null;
  dutyAutoCreateEnabled: boolean | null;
}> => {
  try {
    const response = await systemManagerApi.put<{
      id: string;
      dutyCalendarEnabled: boolean | null;
      dutyMaxParticipants: number | null;
      dutyAutoCreateEnabled: boolean | null;
    }>('/system-manager/duty-settings', settings);
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.message);
    }
    throw error;
  }
};

// --- HOLIDAYS MANAGEMENT ---

export interface Holiday {
  id: number;
  date: string;
  name: string;
  is_recurring: boolean;
  created_by?: number;
  created_at: string;
}

/**
 * Dohvaća sve praznike
 */
export const getAllHolidays = async (): Promise<Holiday[]> => {
  try {
    const response = await systemManagerApi.get<Holiday[]>('/system-manager/holidays');
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.message);
    }
    throw error;
  }
};

/**
 * Dohvaća praznike za određenu godinu
 */
export const getHolidaysForYear = async (year: number): Promise<Holiday[]> => {
  try {
    // Tenant parametar se automatski dodaje u request interceptoru
    const response = await systemManagerApi.get<Holiday[]>(`/system-manager/holidays/${year}`);
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.message);
    }
    throw error;
  }
}

/**
 * Kreira novi praznik
 */
export const createHoliday = async (data: Omit<Holiday, 'id' | 'created_at'>): Promise<Holiday> => {
  try {
    const response = await systemManagerApi.post<Holiday>('/system-manager/holidays', data);
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.message);
    }
    throw error;
  }
};

/**
 * Ažurira postojeći praznik
 */
export const updateHoliday = async (id: number, data: Partial<Omit<Holiday, 'id' | 'created_at'>>): Promise<Holiday> => {
  try {
    const response = await systemManagerApi.put<Holiday>(`/system-manager/holidays/${id}`, data);
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.message);
    }
    throw error;
  }
};

/**
 * Briše praznik
 */
export const deleteHoliday = async (id: number): Promise<void> => {
  try {
    await systemManagerApi.delete(`/system-manager/holidays/${id}`);
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.message);
    }
    throw error;
  }
};

/**
 * Seeduje default hrvatske praznike za godinu
 */
export const seedDefaultHolidays = async (year: number): Promise<{
  created: number;
  skipped: number;
  details: {
    createdHolidays: string[];
    skippedHolidays: string[];
  };
}> => {
  try {
    const response = await systemManagerApi.post<{
      created: number;
      skipped: number;
      details: {
        createdHolidays: string[];
        skippedHolidays: string[];
      };
    }>('/system-manager/holidays/seed', { year });
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.message);
    }
    throw error;
  }
};

/**
 * Briše sve praznike za godinu
 */
export const deleteHolidaysForYear = async (year: number): Promise<{ count: number; message?: string }> => {
  try {
    const response = await systemManagerApi.delete<{ count: number; message?: string }>(`/system-manager/holidays/year/${year}`);
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.message);
    }
    throw error;
  }
};

export const verify2faAndProceed = async (tempToken: string, code: string): Promise<Verify2faResponse> => {
  const response = await systemManagerApi.post<Verify2faResponse>('/system-manager/verify-2fa', { tempToken, code });
  return response.data;
};

export const forceChangePassword = async (tempToken: string, newPassword: string): Promise<ChangePasswordResponse> => {
  const response = await systemManagerApi.post<ChangePasswordResponse>('/system-manager/force-change-password', { tempToken, newPassword });
  return response.data;
};

export default systemManagerApi;
