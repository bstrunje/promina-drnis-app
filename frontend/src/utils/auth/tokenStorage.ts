/**
 * Utility za upravljanje spremanjem tokena u localStorage
 */

/**
 * Funkcija za spremanje refresh tokena u localStorage
 */
export function storeRefreshToken(token: string): void {
  try {
    localStorage.setItem("refreshToken", token);
    console.log('Refresh token spremljen u localStorage kao backup');
  } catch (error) {
    console.error("Greška pri spremanju refresh tokena u lokalno spremište:", error);
  }
}

/**
 * Funkcija za dohvat refresh tokena iz lokalnog spremišta
 */
export function getStoredRefreshToken(): string | null {
  try {
    return localStorage.getItem("refreshToken");
  } catch (error) {
    console.error("Greška pri dohvatu refresh tokena iz lokalnog spremišta:", error);
    return null;
  }
}

/**
 * Funkcija za brisanje refresh tokena iz lokalnog spremišta
 */
export function clearStoredRefreshToken(): void {
  try {
    localStorage.removeItem("refreshToken");
  } catch (error) {
    console.error("Greška pri brisanju refresh tokena iz lokalnog spremišta:", error);
  }
}

/**
 * Objekt za upravljanje svim tokenima
 */
export const tokenStorage = {
  storeAccessToken(token: string): void {
    localStorage.setItem("token", token);
  },
  
  getAccessToken(): string | null {
    return localStorage.getItem("token");
  },
  
  clearAccessToken(): void {
    localStorage.removeItem("token");
  },
  
  storeRefreshToken,
  getRefreshToken: getStoredRefreshToken,
  clearRefreshToken: clearStoredRefreshToken,
  
  clearAllTokens(): void {
    this.clearAccessToken();
    this.clearRefreshToken();
  }
};
