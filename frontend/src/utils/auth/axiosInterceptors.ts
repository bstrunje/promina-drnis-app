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
      if (!isAxiosError(error)) {
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      }

      const originalRequest: AxiosRequestConfigWithRetry = error.config ?? {};

      // Ako greška nije 401 ili ako je zahtjev već bio ponovljen, ne pokušavaj ponovno.
      if (error.response?.status !== 401 || originalRequest._retry) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      console.log('Access token istekao, pokušavam ga osvježiti...');

      try {
        const newToken = await refreshTokenFn();
        if (newToken) {
          console.log('Token uspješno osvježen, ponavljam originalni zahtjev.');
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          return axios(originalRequest);
        } else {
          // Ako refreshTokenFn vrati null, to znači da je i refresh token nevažeći.
          console.log('Refresh token nije valjan, odjavljujem korisnika.');
          await logoutFn();
          return Promise.reject(error instanceof Error ? error : new Error(String(error)));
        }
      } catch (refreshError) {
        console.error('Greška pri osvježavanju tokena, odjavljujem korisnika:', refreshError);
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
