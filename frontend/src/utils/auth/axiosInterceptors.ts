/**
 * Utility za konfiguraciju axios interceptora za automatsko osvježavanje tokena
 */

import axios, { AxiosRequestConfig, AxiosError } from 'axios';

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
  _token: string | null,
  refreshTokenFn: () => Promise<string | null>,
  logoutFn: () => void | Promise<void>
): () => void {
  // Interceptor za dodavanje tokena u zahtjeve
  const requestInterceptor = axios.interceptors.request.use(
    (config) => {
      // KRITIČNO: Odredi koji token koristiti ovisno o URL-u
      const url = config.url ?? '';
      
      // Ako je SystemManager API poziv, koristi systemManagerToken
      if (url.includes('/system-manager')) {
        const systemManagerToken = localStorage.getItem("systemManagerToken");
        if (systemManagerToken) {
          config.headers.Authorization = `Bearer ${systemManagerToken}`;
        }
      } else {
        // Inače koristi obični Member token
        const latestToken = localStorage.getItem("token");
        if (latestToken) {
          config.headers.Authorization = `Bearer ${latestToken}`;
        }
      }

      // Time Traveler: Dodaj mock date u header ako postoji (samo u dev modu)
      if (import.meta.env.DEV) {
        const mockDate = localStorage.getItem('app_mock_date');
        if (mockDate) {
          config.headers['x-mock-date'] = mockDate;
        }
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
      if (!isAxiosError(error)) {
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      }

      const originalRequest: AxiosRequestConfigWithRetry = error.config ?? {};

      // Ako greška nije 401 ili ako je zahtjev već bio ponovljen, ne pokušavaj ponovno.
      if (error.response?.status !== 401 || originalRequest._retry) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      if (import.meta.env.DEV) console.log('Access token istekao, pokušavam ga osvježiti...');

      try {
        const newToken = await refreshTokenFn();
        if (newToken) {
          if (import.meta.env.DEV) console.log('Token uspješno osvježen, ponavljam originalni zahtjev.');
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          return axios(originalRequest);
        } else {
          // Ako refreshTokenFn vrati null, to znači da je i refresh token nevažeći.
          if (import.meta.env.DEV) console.log('Refresh token nije valjan, odjavljujem korisnika.');
          await logoutFn();
          return Promise.reject(error instanceof Error ? error : new Error(String(error)));
        }
      } catch (refreshError) {
        if (import.meta.env.DEV) console.error('Greška pri osvježavanju tokena, odjavljujem korisnika:', refreshError);
        await logoutFn();
        return Promise.reject(refreshError instanceof Error ? refreshError : new Error(String(refreshError)));
      }
    }
  );

  // Vrati funkciju za čišćenje interceptora
  return () => {
    axios.interceptors.request.eject(requestInterceptor);
    axios.interceptors.response.eject(responseInterceptor);
  };
}
