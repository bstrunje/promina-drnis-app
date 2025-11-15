/**
 * Servis za upravljanje autentikacijskim tokenima
 */

import { withRetry } from './refreshUtils';
import { tokenStorage } from './tokenStorage';
import { API_BASE_URL } from '../config';
import { jwtDecode } from 'jwt-decode';
import { navigateToLogin } from './navigationHelper';
import { getCurrentTenant, extractOrgSlugFromPath } from '../tenantUtils';
const isDev = import.meta.env.DEV;

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken?: string;
}

/**
 * Servis za upravljanje autentikacijskim tokenima
 */
// Varijabla za praćenje timera za automatsko osvježavanje
let refreshTimerId: number | null = null;
let visibilityChangeHandler: (() => void) | null = null;

// Vrijeme u milisekundama prije isteka tokena kada ćemo ga osvježiti (2 minute)
const REFRESH_THRESHOLD_MS = 2 * 60 * 1000;

// Globalni lock za sprječavanje paralelnih refresh zahtjeva (single-flight)
let inFlightRefresh: Promise<string | null> | null = null;

// Cross-tab koordinacija: BroadcastChannel + storage fallback
const BC_NAME = 'auth_refresh_channel';
const STORAGE_KEY = 'auth_refresh_status';
interface CrossTabStatus { status: 'in_progress' | 'done' | 'failed'; ts: number; token?: string | null }

// Helper: Dohvati status iz localStorage
function getCrossTabStatus(): CrossTabStatus | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CrossTabStatus) : null;
  } catch {
    return null;
  }
}

// Helper: Postavi status u localStorage (triggers storage event u drugim tabovima)
function setCrossTabStatus(status: CrossTabStatus) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(status)); } catch { /* ignore */ }
}

// Helper: Pričekaj rezultat refresh-a iz drugog taba (BroadcastChannel ili storage)
function waitForCrossTabRefresh(timeoutMs = 20000): Promise<string | null> {
  return new Promise((resolve) => {
    let finished = false;
    const done = (token: string | null) => { if (!finished) { finished = true; cleanup(); resolve(token); } };

    const cleanupFns: (() => void)[] = [];

    // BroadcastChannel listener
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel(BC_NAME);
        const bcHandler = (ev: MessageEvent) => {
          const data = ev.data as { type: string; token?: string | null } | undefined;
          if (!data || data.type !== 'auth_refresh_result') return;
          done(data.token ?? null);
        };
        bc.addEventListener('message', bcHandler);
        cleanupFns.push(() => bc?.removeEventListener('message', bcHandler));
        cleanupFns.push(() => bc?.close());
      }
    } catch { /* ignore */ }

    // storage event fallback
    const storageHandler = (ev: StorageEvent) => {
      if (ev.key !== STORAGE_KEY || !ev.newValue) return;
      try {
        const parsed = JSON.parse(ev.newValue) as CrossTabStatus;
        if (parsed.status === 'done') done(parsed.token ?? null);
        if (parsed.status === 'failed') done(null);
      } catch { /* ignore */ }
    };
    window.addEventListener('storage', storageHandler);
    cleanupFns.push(() => window.removeEventListener('storage', storageHandler));

    // Timeout
    const t = window.setTimeout(() => done(null), timeoutMs);
    cleanupFns.push(() => window.clearTimeout(t));

    const cleanup = () => { cleanupFns.forEach((fn) => { try { fn(); } catch { /* ignore */ } }); };
  });
}

// Helper: Pošalji rezultat preko BC i storage-a
function broadcastRefreshResult(token: string | null) {
  try {
    const msg = { type: 'auth_refresh_result', token };
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel(BC_NAME);
      bc.postMessage(msg);
      bc.close();
    }
  } catch { /* ignore */ }
  setCrossTabStatus({ status: token ? 'done' : 'failed', ts: Date.now(), token });
}

export class AuthTokenService {
  /**
   * Dohvaća API URL ovisno o okruženju
   */
  static getApiUrl(endpoint: string): string {
    // Koristimo konfiguraciju iz config.ts koja automatski detektira lokalni/Docker setup
    const apiEndpoint = endpoint.startsWith('/api/') ? endpoint.substring(5) : endpoint;
    return `${API_BASE_URL}/${apiEndpoint}`;
  }

  /**
   * Osvježava token i vraća novi access token
   */
  static async refreshToken(): Promise<string | null> {
    // Ako drugi tab već radi refresh (u zadnjih 20s), pričekaj njegov rezultat
    const status = getCrossTabStatus();
    if (status && status.status === 'in_progress' && Date.now() - status.ts < 20000) {
      if (isDev) console.log('[Auth] Čekam rezultat refresh-a iz drugog taba...');
      return waitForCrossTabRefresh();
    }

    // Ako je refresh već u tijeku u ovom tabu, pričekaj isti rezultat
    if (inFlightRefresh) return inFlightRefresh;

    // Napomena (HR): Koalesciramo paralelne refresh pozive kako bismo izbjegli race condition
    // (npr. jedan refresh rotira token u bazi, drugi u međuvremenu koristi stari token -> 401/403).
    inFlightRefresh = (async () => {
      // Označi cross-tab status kao in_progress
      setCrossTabStatus({ status: 'in_progress', ts: Date.now() });

      const doRefresh = async (): Promise<string | null> => {

        // console.log('Slanje zahtjeva za osvježavanje tokena (koristi se HTTP-only cookie)');
        const tenant = getCurrentTenant();
        const refreshUrl = this.getApiUrl('/api/auth/refresh') + `?tenant=${encodeURIComponent(tenant)}`;
        const response = await fetch(refreshUrl, {
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
          if (isDev) console.warn(`Osvježavanje tokena nije uspjelo (${response.status}), token više nije važeći`);
          broadcastRefreshResult(null);
          // Centralizirani logout za sve tabove
          void this.logout();
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
          broadcastRefreshResult(data.accessToken);
          return data.accessToken;
        }

        broadcastRefreshResult(null);
        return null;
      };

      // Za 5xx/mrežne greške koristimo withRetry, dok 401/403 slučaj rješavamo unutar doRefresh
      return withRetry(doRefresh);
    })();

    try {
      return await inFlightRefresh;
    } finally {
      // Oslobodi lock nakon što je refresh završen (uspješno ili neuspješno)
      inFlightRefresh = null;
      // Vrati cross-tab status u idle (čistimo nakon kratke odgode)
      setTimeout(() => {
        try {
          const s = getCrossTabStatus();
          if (s && s.status !== 'in_progress') localStorage.removeItem(STORAGE_KEY);
        } catch { /* ignore */ }
      }, 2000);
    }
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
      if (isDev) console.error('Greška pri dekodiranju tokena:', error);
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

    // Postavi interval koji će provjeravati treba li osvježiti token svakih 30 sekundi
    refreshTimerId = window.setInterval(() => {
      void (async () => {
        try {
          if (this.shouldRefreshToken()) {
            const newToken = await this.refreshToken();

            if (newToken) {
              // Token uspješno osvježen
            } else {
              // Ako osvježavanje nije uspjelo, zaustavi automatsko osvježavanje i odjavi korisnika
              this.stopAutoRefresh();
              void this.logout();
            }
          }
        } catch (error) {
          if (isDev) console.error('Greška pri automatskom osvježavanju tokena:', error);
        }
      })();
    }, 30000);

    // Dodaj listener za kada se tab reaktivira - provjeri token odmah
    visibilityChangeHandler = () => {
      if (document.visibilityState === 'visible') {
        void (async () => {
          try {
            if (this.shouldRefreshToken()) {
              const newToken = await this.refreshToken();
              if (!newToken) {
                this.stopAutoRefresh();
                void this.logout();
              }
            }
          } catch (error) {
            if (isDev) console.error('Greška pri provjeri tokena nakon reaktiviranja taba:', error);
          }
        })();
      }
    };

    document.addEventListener('visibilitychange', visibilityChangeHandler);
  }

  /**
   * Zaustavlja automatsko osvježavanje tokena
   */
  static stopAutoRefresh(): void {
    if (refreshTimerId !== null) {
      window.clearInterval(refreshTimerId);
      refreshTimerId = null;
    }
    
    if (visibilityChangeHandler !== null) {
      document.removeEventListener('visibilitychange', visibilityChangeHandler);
      visibilityChangeHandler = null;
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
      const tenant = getCurrentTenant();
      const logoutUrl = this.getApiUrl('/api/auth/logout') + `?tenant=${encodeURIComponent(tenant)}`;
      const response = await fetch(logoutUrl, {
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
        if (isDev) console.error(`Greška pri odjavi na backendu: HTTP ${response.status}`);
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
      if (isDev) console.error("Greška pri odjavi na backendu:", error);
    } finally {
      // Čistimo sve tokene
      tokenStorage.clearAllTokens();
      
      // console.log("Uklonjeni svi tokeni");
      // Preusmjeri korisnika na login stranicu
      // Preusmjeravanje na login koristeći globalni navigate helper (ako je dostupan)
      // ili window.location.replace kao fallback
      // Komentar: Ovo omogućuje SPA redirect gdje god je moguće
      try {
        navigateToLogin();
      } catch {
        // Ako helper nije dostupan, koristimo klasični redirect s org prefix-om
        const orgSlug = extractOrgSlugFromPath();
        const loginPath = orgSlug ? `/${orgSlug}/login` : '/login';
        window.location.replace(loginPath);
      }
    }
  }
}
