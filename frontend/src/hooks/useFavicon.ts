import { useEffect } from 'react';

/**
 * Hook za dinamičko postavljanje favicon-a
 * @param faviconUrl - URL favicon slike (tenant logo ili fallback)
 */
export const useFavicon = (faviconUrl: string | null) => {
  useEffect(() => {
    if (!faviconUrl) return;

    // Pronađi postojeći favicon link element
    let link = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
    
    if (!link) {
      // Ako ne postoji, kreiraj novi
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }

    // Postavi novi favicon URL
    link.type = 'image/png';
    link.href = faviconUrl;

    console.log('[FAVICON] Postavljen novi favicon:', faviconUrl);
  }, [faviconUrl]);
};
