// frontend/src/utils/config.ts
// ISPRAVKA: Razlikujemo lokalni razvoj od produkcije za upload pristup
// U lokalnom razvoju frontend (5173) i backend (3001) su na različitim portovima
// U produkciji (Vercel) dijele istu domenu

const isLocalDevelopment = import.meta.env.DEV && window.location.hostname === 'localhost';

export const API_BASE_URL = isLocalDevelopment 
  ? 'http://localhost:3001/api'  // Lokalni razvoj - direktno na backend port
  : '/api';                      // Produkcija - relativna putanja

export const IMAGE_BASE_URL = isLocalDevelopment 
  ? 'http://localhost:3001/uploads'  // Lokalni razvoj - direktno na backend port
  : '/uploads';                       // Produkcija - relativna putanja

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