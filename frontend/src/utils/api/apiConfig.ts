import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getApiBaseUrl } from '../tenantUtils';

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
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
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
