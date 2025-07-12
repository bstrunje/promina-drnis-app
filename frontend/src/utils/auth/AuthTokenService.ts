/**
 * Servis za upravljanje autentikacijskim tokenima
 */

import { withRetry } from './refreshUtils';
import { tokenStorage } from './tokenStorage';
import { API_BASE_URL } from '../config';
import { jwtDecode } from 'jwt-decode';
import { navigateToLogin } from './navigationHelper';

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken?: string;
}

/**
 * Servis za upravljanje autentikacijskim tokenima
 */
// Varijabla za praćenje timera za automatsko osvježavanje
let refreshTimerId: number | null = null;

// Vrijeme u milisekundama prije isteka tokena kada ćemo ga osvježiti (2 minute)
const REFRESH_THRESHOLD_MS = 2 * 60 * 1000;

export class AuthTokenService {
  /**
   * Dohvaća API URL ovisno o okruženju
   */
  static getApiUrl(endpoint: string): string {
    // U razvojnom okruženju, Vite proxy rješava preusmjeravanje. Koristimo relativnu putanju.
    if (import.meta.env.DEV) {
      return endpoint;
    }
    // U produkciji, koristimo punu putanju definiranu u konfiguraciji.
    const apiEndpoint = endpoint.startsWith('/api/') ? endpoint.substring(4) : endpoint;
    return `${API_BASE_URL}${apiEndpoint}`;
  }

  /**
   * Osvježava token i vraća novi access token
   */
  static async refreshToken(): Promise<string | null> {
    return withRetry(async () => {

      // console.log('Slanje zahtjeva za osvježavanje tokena (koristi se HTTP-only cookie)');
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
        // console.log('Primljen novi refresh token, ažuriram lokalno spremište');
        tokenStorage.storeRefreshToken(data.refreshToken);
      }

      // Spremanje novog access tokena
      if (data.accessToken) {
        tokenStorage.storeAccessToken(data.accessToken);
        // Dodano logiranje za debugiranje
        // console.log("Novi access token spremljen u localStorage:", data.accessToken);
        // console.log("Token uspješno obnovljen");
        return data.accessToken;
      }

      return null;
    });
  }

  /**
   * Analizira JWT token i vraća vrijeme isteka
   * @param token JWT token za analizu
   * @returns Vrijeme isteka tokena u milisekundama ili null ako token nije valjan
   */
  static getTokenExpiryTime(token: string | null): number | null {
    if (!token) return null;

    try {
      // Dekodiranje tokena bez verifikacije potpisa
      const decoded = jwtDecode<{ exp?: number }>(token);

      if (!decoded.exp) return null;

      // exp je u sekundama, pretvaramo u milisekunde
      return decoded.exp * 1000;
    } catch (error) {
      console.error('Greška pri dekodiranju tokena:', error);
      return null;
    }
  }

  /**
   * Provjerava treba li osvježiti token
   * @returns true ako token treba osvježiti, false ako ne treba ili nema tokena
   */
  static shouldRefreshToken(): boolean {
    const accessToken = tokenStorage.getAccessToken();
    if (!accessToken) return false;

    const expiryTime = this.getTokenExpiryTime(accessToken);
    if (!expiryTime) return false;

    // Osvježi token ako ističe za manje od REFRESH_THRESHOLD_MS (2 minute)
    const shouldRefresh = Date.now() + REFRESH_THRESHOLD_MS > expiryTime;

    if (shouldRefresh) {
      // console.log(`Token će isteći za ${Math.round((expiryTime - Date.now()) / 1000)} sekundi, potrebno osvježavanje`);
    }

    return shouldRefresh;
  }

  /**
   * Započinje automatsko osvježavanje tokena
   * Postavlja interval koji će provjeravati treba li osvježiti token
   */
  static startAutoRefresh(): void {
    // Prvo očisti postojeći timer ako postoji
    this.stopAutoRefresh();

    // console.log('Započeto automatsko osvježavanje tokena');

    // Postavi interval koji će provjeravati treba li osvježiti token svakih 30 sekundi
    refreshTimerId = window.setInterval(async () => {
      try {
        if (this.shouldRefreshToken()) {
          // console.log('Automatsko osvježavanje tokena...');
          const newToken = await this.refreshToken();

          if (newToken) {
            // console.log('Token uspješno osvježen automatski');
          } else {
            console.warn('Automatsko osvježavanje tokena nije uspjelo. Pokrećem odjavu korisnika.');
            // Ako osvježavanje nije uspjelo, zaustavi automatsko osvježavanje i odjavi korisnika
            this.stopAutoRefresh();
            void this.logout(); // Pozivamo logout
          }
        }
      } catch (error) {
        console.error('Greška pri automatskom osvježavanju tokena:', error);
      }
    }, 30000); // Provjera svakih 30 sekundi
  }

  /**
   * Zaustavlja automatsko osvježavanje tokena
   */
  static stopAutoRefresh(): void {
    if (refreshTimerId !== null) {
      window.clearInterval(refreshTimerId);
      refreshTimerId = null;
      // console.log('Zaustavljeno automatsko osvježavanje tokena');
    }
  }

  /**
   * Pokreće odjavu korisnika - čisti tokene i zaustavlja automatsko osvježavanje
   */
  static async logout(): Promise<void> {
    // console.log('[AuthTokenService.logout] Logout pozvan.');
    try {
      // Zaustavi automatsko osvježavanje tokena
      this.stopAutoRefresh();

      // console.log("Započinjem proces odjave korisnika...");

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
        // console.log("Korisnik uspješno odjavljen na backendu");
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

      // console.log("Kolačići i zastarjeli tokeni očišćeni na klijentskoj strani");
    } catch (error) {
      console.error("Greška pri odjavi na backendu:", error);
    } finally {
      // Čistimo sve tokene
      tokenStorage.clearAllTokens();
      // console.log("Uklonjeni svi tokeni");
      // Preusmjeri korisnika na login stranicu
      // Preusmjeravanje na login koristeći globalni navigate helper (ako je dostupan)
      // ili window.location.replace kao fallback
      // Komentar: Ovo omogućuje SPA redirect gdje god je moguće
      try {
        console.log('[AuthTokenService.logout] Pokušavam pozvati navigateToLogin...');
        navigateToLogin();
      } catch (e) {
        console.error('[AuthTokenService.logout] Greška pri importu navigationHelper ili pozivu navigateToLogin:', e);
        // console.log('[AuthTokenService.logout] Fallback: window.location.replace("/login")');
        // Ako helper nije dostupan, koristimo klasični redirect
        window.location.replace('/login');
      }
    }
  }
}
