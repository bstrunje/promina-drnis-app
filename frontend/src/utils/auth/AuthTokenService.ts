/**
 * Servis za upravljanje autentikacijskim tokenima
 */

import { withRetry } from './refreshUtils';
import { tokenStorage } from './tokenStorage';
import { API_BASE_URL } from '../config';

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken?: string;
}

/**
 * Servis za upravljanje autentikacijskim tokenima
 */
export class AuthTokenService {
  /**
   * Dohvaća API URL ovisno o okruženju
   */
  static getApiUrl(endpoint: string): string {
    // U produkciji koristimo API_BASE_URL iz config.ts
    // U razvoju koristimo direktne putanje jer su frontend i backend na različitim portovima
    const isDevelopment = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';
    if (isDevelopment) {
      return `${window.location.protocol}//${window.location.hostname}:3000${endpoint}`;
    } else {
      // Koristimo API_BASE_URL iz config.ts i dodajemo endpoint bez /api prefiksa
      // jer API_BASE_URL već sadrži /api
      const apiEndpoint = endpoint.startsWith('/api/') ? endpoint.substring(4) : endpoint;
      return `${API_BASE_URL}${apiEndpoint}`;
    }
  }

  /**
   * Osvježava token i vraća novi access token
   */
  static async refreshToken(): Promise<string | null> {
    return withRetry(async () => {
  
      console.log('Slanje zahtjeva za osvježavanje tokena (koristi se HTTP-only cookie)');
      const response = await fetch(this.getApiUrl('/api/auth/refresh'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        // body: JSON.stringify(requestBody) // makni body ili pošalji '{}'
        body: JSON.stringify({})
      });
      
      // Ako je status 401 ili 403, token je nevažeći - nema smisla ponovno pokušavati
      if (response.status === 401 || response.status === 403) {
        console.warn(`Osvježavanje tokena nije uspjelo (${response.status}), token više nije važeći`);
        return null;
      }
      
      // Za ostale greške koje mogu biti privremene (npr. mrežne greške)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Obrada uspješnog odgovora
      const data = await response.json() as RefreshTokenResponse;
      
      // Spremanje novog refresh tokena ako je dobiven (u localStorage kao backup)
      if (data.refreshToken) {
        console.log('Primljen novi refresh token, ažuriram lokalno spremište');
        tokenStorage.storeRefreshToken(data.refreshToken);
      }
      
      // Spremanje novog access tokena
      if (data.accessToken) {
        tokenStorage.storeAccessToken(data.accessToken);
        // Dodano logiranje za debugiranje
        console.log("Novi access token spremljen u localStorage:", data.accessToken);
        console.log("Token uspješno obnovljen");
        return data.accessToken;
      }
      
      return null;
    });
  }

  /**
   * Pokreće odjavu korisnika - čisti tokene
   */
  static async logout(): Promise<void> {
    try {
      console.log("Započinjem proces odjave korisnika...");
      
      // Poziv backend API-ja za odjavu i poništavanje refresh tokena
      const response = await fetch(this.getApiUrl('/api/auth/logout'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      if (response.ok) {
        console.log("Korisnik uspješno odjavljen na backendu");
      } else {
        console.error(`Greška pri odjavi na backendu: HTTP ${response.status}`);
      }
      
      // Dodatno čišćenje kolačića na klijentskoj strani kao sigurnosna mjera
      // Koristimo ispravnu putanju za kolačiće
      document.cookie = "refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/api/auth;";
      
      // Brisanje systemManagerRefreshToken kolačića ako postoji
      // kako bi se izbjegao konflikt između dva tipa tokena
      document.cookie = "systemManagerRefreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/api/system-manager;";
      
      // Za HTTPS ili produkciju, dodajemo secure i SameSite=None atribute
      if (process.env.NODE_ENV === 'production' || window.location.protocol === 'https:') {
        document.cookie = "refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/api/auth; secure; SameSite=None;";
        document.cookie = "systemManagerRefreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/api/system-manager; secure; SameSite=None;";
      }
      
      // Čišćenje zastarjelih tokena iz lokalnog spremišta
      localStorage.removeItem('systemAdmin'); // Zastarjeli naziv
      localStorage.removeItem('systemAdminToken'); // Zastarjeli naziv
      
      console.log("Kolačići i zastarjeli tokeni očišćeni na klijentskoj strani");
    } catch (error) {
      console.error("Greška pri odjavi na backendu:", error);
    } finally {
      // Čistimo sve tokene
      tokenStorage.clearAllTokens();
      console.log("Uklonjeni svi tokeni");
    }
  }
}
