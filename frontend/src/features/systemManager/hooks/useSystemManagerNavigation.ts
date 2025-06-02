// features/systemManager/hooks/useSystemManagerNavigation.ts
import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';

// Singleton instanca za pohranu navigate funkcije
let navigateInstance: ((path: string, options?: { replace?: boolean }) => void) | null = null;

/**
 * Hook koji omogućuje korištenje React Router navigate funkcije izvan React komponenti
 * Koristi se za navigaciju u interceptorima i drugim non-React kontekstima
 */
export const useSystemManagerNavigation = () => {
  const navigate = useNavigate();

  // Pohrani navigate funkciju u singleton instancu
  navigateInstance = navigate;

  // Wrapper funkcija za navigaciju
  const navigateTo = useCallback((path: string, options?: { replace?: boolean }) => {
    navigate(path, options);
  }, [navigate]);

  return { navigateTo };
};

/**
 * Funkcija za navigaciju koja se može koristiti izvan React komponenti
 * Ako navigate funkcija nije dostupna, koristi window.location.href kao fallback
 */
export const navigateToSystemManagerPath = (path: string, options?: { replace?: boolean }) => {
  if (navigateInstance) {
    navigateInstance(path, options);
    return true;
  } else {
    // Fallback ako navigate funkcija nije dostupna
    console.warn('React Router navigate funkcija nije dostupna, koristim window.location.href');
    // Koristimo window.location.href umjesto pathname kako bismo zadržali cijeli URL
    // i izbjegli gubitak prefiksa /system-manager
    const baseUrl = window.location.origin;
    window.location.href = `${baseUrl}${path}`;
    return false;
  }
};