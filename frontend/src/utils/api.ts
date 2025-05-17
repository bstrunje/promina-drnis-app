/**
 * VAŽNO: Ova datoteka je proxy za modularnu strukturu API-ja.
 * Sav novi kod trebao bi koristiti module iz direktorija api/ umjesto ove datoteke.
 * 
 * Ova datoteka postoji samo radi kompatibilnosti sa starim kodom.
 */

// Uvoz aktivnih modula
import apiInstance from './api/config';
import { handleApiError } from './api/utils';
import { AxiosInstance, AxiosResponse, AxiosRequestConfig } from 'axios';

// Direktno izvozimo sve funkcije iz modula

// Izvoz svih funkcija iz modula
export * from './api/types';
export * from './api/auth';
export * from './api/members';
export * from './api/membership';
export * from './api/messages';
export * from './api/stamps';
export * from './api/cards';
export * from './api/misc';

// Izvoz handleApiError funkcije
export { handleApiError };

// Svi tipovi su sada izvezeni iz modula

// Svi tipovi su sada definirani u types.ts modulu

// Sve API funkcije su sada implementirane u modulima i izvezene iznad

// Autentikacija je implementirana u auth.ts modulu i izvezena iznad

// Članovi su implementirani u members.ts modulu i izvezeni iznad

// Poruke su implementirane u messages.ts modulu i izvezene iznad

// Markice su implementirane u stamps.ts modulu i izvezene iznad

// Iskaznice su implementirane u cards.ts modulu i izvezene iznad

// Definiramo tip za api objekt koji uključuje sve metode i funkcije
type ApiType = AxiosInstance & {
  // Koristimo točne tipove iz Axios biblioteke
  get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
};

// Izvoz Axios instance s dodatnim metodama
// Koristimo as unknown as ApiType kako bismo izbjegli probleme s tipovima
const api = apiInstance as ApiType;

export default api;