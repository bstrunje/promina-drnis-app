// frontend/src/utils/config.ts
// ISPRAVKA: Razlikujemo lokalni razvoj od produkcije za upload pristup
// U lokalnom razvoju frontend (5173) i backend (3001) su na različitim portovima
// U produkciji (Vercel) dijele istu domenu

const isLocalDevelopment = import.meta.env.DEV && window.location.hostname === 'localhost';

// Omogućava prebacivanje između lokalnog (3000) i Docker (3001) backend-a
// Postavite VITE_BACKEND_PORT=3001 za Docker backend, inače koristi lokalni (3000)
const backendPort = import.meta.env.VITE_BACKEND_PORT || '3000';

export const API_BASE_URL = isLocalDevelopment 
  ? `http://localhost:${backendPort}/api`  // Dinamički port (3001=Docker, 3000=lokalni)
  : '/api';                                // Produkcija - relativna putanja

export const IMAGE_BASE_URL = isLocalDevelopment 
  ? `http://localhost:${backendPort}/uploads`  // Dinamički port
  : '/uploads';                                 // Produkcija - relativna putanja

// Debug logging za lakše praćenje konfiguracije
if (isLocalDevelopment) {
  console.log('[CONFIG] Lokalni razvoj detektiran:');
  console.log('[CONFIG] API_BASE_URL:', API_BASE_URL);
  console.log('[CONFIG] IMAGE_BASE_URL:', IMAGE_BASE_URL);
} else {
  console.log('[CONFIG] Produkcija/Vercel konfiguracija:');
  console.log('[CONFIG] API_BASE_URL:', API_BASE_URL);
  console.log('[CONFIG] IMAGE_BASE_URL:', IMAGE_BASE_URL);
}