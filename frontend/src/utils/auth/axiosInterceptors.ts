/**
 * Utility za konfiguraciju axios interceptora za automatsko osvježavanje tokena
 */

import axios, { AxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import { MAX_REFRESH_RETRIES, REFRESH_RETRY_DELAY, delay } from './refreshUtils';

// Prošireni tip za axios request konfiguraciju
type AxiosRequestConfigWithRetry = AxiosRequestConfig & {
  _retry?: boolean;
  _retryCount?: number;
};

/**
 * Type guard za provjeru je li error axios error
 */
function isAxiosError(err: unknown): err is AxiosError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'isAxiosError' in err &&
    typeof (err as { isAxiosError: unknown }).isAxiosError === 'boolean'
  );
}

/**
 * Konfigurira axios interceptore za automatsko osvježavanje tokena
 */
export function setupAxiosInterceptors(
  token: string | null,
  refreshTokenFn: () => Promise<string | null>,
  logoutFn: () => void | Promise<void>
): () => void {
  // Interceptor za dodavanje tokena u zahtjeve
  const requestInterceptor = axios.interceptors.request.use(
    (config) => {
      // UVIJEK dohvaćaj svježi token iz localStorage!
      const latestToken = localStorage.getItem("token");
      if (latestToken) {
        config.headers.Authorization = `Bearer ${latestToken}`;
      }
      
      // Osiguraj da se kolačići šalju sa svim zahtjevima
      config.withCredentials = true;
      
      return config;
    },
    (error) => Promise.reject(error instanceof Error ? error : new Error(String(error)))
  );

  // Interceptor za obradu odgovora i automatsko obnavljanje tokena
  const responseInterceptor = axios.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
      // Osiguraj siguran pristup propertijima
      if (!error || typeof error !== 'object') {
        return Promise.reject(new Error('Nepoznata greška u axios interceptoru'));
      }
      
      if (!isAxiosError(error)) {
        return Promise.reject(new Error('Nepoznata greška u axios interceptoru'));
      }
      
      const axiosError = error;
      // Provjeravamo ima li axiosError config property i ako ima, koristimo ga, inače stvaramo novi objekt
      const originalConfig = axiosError.config ?? {};
      const originalRequest: AxiosRequestConfigWithRetry = { ...originalConfig };

      // Inicijaliziraj brojač pokušaja ako ne postoji
      if (typeof originalRequest._retryCount === 'undefined') {
        originalRequest._retryCount = 0;
      }

      // Ako je greška 401 (Unauthorized) i nismo prekoračili maksimalan broj pokušaja
      if (
        axiosError.response?.status === 401 &&
        originalRequest._retryCount < MAX_REFRESH_RETRIES &&
        token // Samo ako postoji token
      ) {
        originalRequest._retryCount++;
        console.log(`Zahtjev vratio 401, pokušavam osvježiti token (pokušaj ${originalRequest._retryCount}/${MAX_REFRESH_RETRIES})...`);

        try {
          // Pokušaj osvježiti token
          const newToken = await refreshTokenFn();
          if (newToken) {
            // Sigurno dodavanje Authorization headera
            // Provjeravamo postojanje headers objekta i stvaramo novi ako ne postoji
            if (!originalRequest.headers) {
              originalRequest.headers = {};
            }
            
            // Postavljamo Authorization header
            originalRequest.headers = {
              ...originalRequest.headers,
              Authorization: `Bearer ${newToken}`
            };
            
            // Ponovno šaljemo originalni zahtjev s novim tokenom
            return axios(originalRequest as AxiosRequestConfig);
          } else if (originalRequest._retryCount < MAX_REFRESH_RETRIES) {
            // Ako nismo uspjeli osvježiti token, ali još imamo pokušaja
            await delay(REFRESH_RETRY_DELAY);
            return axios(originalRequest as AxiosRequestConfig);
          }
        } catch (refreshError) {
          console.error("Greška pri obnavljanju tokena u interceptoru:", refreshError);
          
          // Ako još imamo pokušaja, probaj ponovno
          if (originalRequest._retryCount < MAX_REFRESH_RETRIES) {
            await delay(REFRESH_RETRY_DELAY);
            return axios(originalRequest as AxiosRequestConfig);
          }
          
          // Tek nakon što smo iscrpili sve pokušaje, odjavi korisnika
          console.log('Iscrpljeni svi pokušaji obnavljanja tokena, odjavljujem korisnika');
          void logoutFn();
        }
      }
      
      // Za mrežne greške koje nisu vezane za autentikaciju, također možemo pokušati ponovno
      if (
        (!axiosError.response || axiosError.code === 'ECONNABORTED' || axiosError.message.includes('Network Error')) &&
        originalRequest._retryCount < MAX_REFRESH_RETRIES
      ) {
        originalRequest._retryCount++;
        console.log(`Mrežna greška, pokušavam ponovno (pokušaj ${originalRequest._retryCount}/${MAX_REFRESH_RETRIES})...`);
        
        await delay(REFRESH_RETRY_DELAY);
        return axios(originalRequest as AxiosRequestConfig);
      }
      
      return Promise.reject(error instanceof Error ? error : new Error(JSON.stringify(error)));
    }
  );

  // Vrati funkciju za čišćenje interceptora
  return () => {
    axios.interceptors.request.eject(requestInterceptor);
    axios.interceptors.response.eject(responseInterceptor);
  };
}
