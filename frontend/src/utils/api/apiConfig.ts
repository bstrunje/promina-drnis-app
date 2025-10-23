import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getApiBaseUrl, getCurrentTenant, extractOrgSlugFromPath } from '../tenantUtils';

type ParamsRecord = Record<string, unknown>;

// Stvaranje Axios instance s tenant-aware konfiguracijom
const apiInstance = axios.create({
  baseURL: getApiBaseUrl(), // Tenant-aware API base URL
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 sekundi timeout
  withCredentials: true, // Omogućuje slanje i primanje kolačića u cross-origin zahtjevima
});

// Interceptor za dodavanje tokena u zaglavlje
apiInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Provjeri GSM/Org SM token prvo, zatim obični member/admin token
    const systemManagerToken = localStorage.getItem('systemManagerToken');
    const regularToken = localStorage.getItem('token');
    
    const token = systemManagerToken ?? regularToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Globalno dodaj tenant parametar za sve member/admin API pozive
    try {
      const url = config.url ?? '';
      const hasTenantParam = Boolean((config.params as ParamsRecord | undefined)?.tenant);
      const isSystemManagerRoute = url.startsWith('/system-manager');
      const isSupportRoute = url.startsWith('/support');
      if (!hasTenantParam && !isSystemManagerRoute && !isSupportRoute) {
        const tenant = getCurrentTenant();
        const currentParams: ParamsRecord = (config.params as ParamsRecord | undefined) ?? {};
        config.params = { ...currentParams, tenant } as unknown;
      }
    } catch (error) {
      // Ako tenant nije dostupan, preusmjeri na login
      console.error('[API-CONFIG] Tenant nije dostupan:', error);
      // Očisti localStorage i preusmjeri
      localStorage.removeItem('current_tenant');
      localStorage.removeItem('organization_branding');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Dohvati org slug i preusmjeri na odgovarajući login
      const orgSlug = extractOrgSlugFromPath();
      
      // MULTI-TENANCY: NE smijemo fallback-ati na specifičnu organizaciju!
      // Ako nema org slug-a, redirect na welcome stranicu
      if (!orgSlug) {
        // Welcome stranica gdje korisnik može odabrati organizaciju
        if (window.location.pathname !== '/') {
          window.location.href = '/';
        }
        return Promise.reject(new Error('Tenant selection required'));
      }
      
      // Ako ima org slug, redirect na login te organizacije
      const loginPath = `/${orgSlug}/login`;
      if (window.location.pathname !== loginPath) {
        window.location.href = loginPath;
      }
      // Odbij zahtjev
      return Promise.reject(new Error('Tenant is required'));
    }

    return config;
  },
  (error: unknown) => {
    // Osiguravamo da se uvijek odbacuje objekt Error
    if (error instanceof Error) {
      return Promise.reject(error);
    }
    return Promise.reject(new Error(String(error)));
  }
);

// Response interceptor za rukovanje s 401 greškama
// Napomena: Glavna logika za osvježavanje tokena je implementirana u axiosInterceptors.ts
// koji se koristi u AuthContext.tsx. Ovaj interceptor je samo za API pozive koji ne prolaze kroz AuthContext.
apiInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Posebna obrada za login zahtjeve
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    
    // Ako je greška 401 ali NIJE login zahtjev (dakle izgubljena sesija negdje drugdje)
    // Napomena: Ne pokušavamo osvježiti token ovdje jer to radi axiosInterceptors.ts
    if (error.response?.status === 401 && !isLoginRequest) {
      console.log('401 greška detektirana u apiConfig interceptoru');
      // Ne radimo ništa posebno ovdje, samo prosljeđujemo grešku
      // axiosInterceptors.ts će se pobrinuti za osvježavanje tokena
    }
    
    // Za sve ostale greške vraćamo originalnu grešku
    return Promise.reject(error);
  }
);

export default apiInstance;
