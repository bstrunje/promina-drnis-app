/**
 * PWA UTILITIES
 * 
 * Utility funkcije za dinamičku konfiguraciju PWA-a prema tenant-u
 */

import { extractOrgSlugFromPath } from './tenantUtils';

/**
 * Dodaje ili ažurira <link rel="manifest"> tag u <head>
 * Manifest URL se generira dinamički na temelju tenant-a
 */
export const updateManifestLink = (): void => {
  try {
    const orgSlug = extractOrgSlugFromPath();
    
    // Samo ako je unutar org context-a
    if (!orgSlug) {
      console.log('[PWA] No org slug detected - skipping manifest update');
      return;
    }

    // Ukloni postojeći manifest link ako postoji
    const existingLink = document.querySelector('link[rel="manifest"]');
    if (existingLink) {
      existingLink.remove();
    }

    // Kreiraj novi manifest link
    const manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    manifestLink.href = `/api/manifest?tenant=${orgSlug}`;
    
    // Dodaj u <head>
    document.head.appendChild(manifestLink);
    
    console.log(`[PWA] Manifest updated for org: ${orgSlug}`);
  } catch (error) {
    console.error('[PWA] Error updating manifest link:', error);
  }
};

/**
 * Ažurira theme-color meta tag na temelju org branding-a
 */
export const updateThemeColor = (color: string): void => {
  try {
    let themeColorMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    
    if (!themeColorMeta) {
      themeColorMeta = document.createElement('meta');
      themeColorMeta.name = 'theme-color';
      document.head.appendChild(themeColorMeta);
    }
    
    themeColorMeta.content = color;
    console.log(`[PWA] Theme color updated: ${color}`);
  } catch (error) {
    console.error('[PWA] Error updating theme color:', error);
  }
};

/**
 * Ažurira <title> i meta description
 */
export const updatePageMeta = (orgName: string): void => {
  try {
    // Title
    document.title = orgName;
    
    // Description meta tag
    let descriptionMeta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!descriptionMeta) {
      descriptionMeta = document.createElement('meta');
      descriptionMeta.name = 'description';
      document.head.appendChild(descriptionMeta);
    }
    descriptionMeta.content = `Aplikacija za članove ${orgName}`;
    
    console.log(`[PWA] Page meta updated for: ${orgName}`);
  } catch (error) {
    console.error('[PWA] Error updating page meta:', error);
  }
};

/**
 * Registrira Service Worker za org scope
 */
export const registerServiceWorker = async (orgSlug: string): Promise<void> => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: `/${orgSlug}/`
      });
      console.log(`[PWA] Service Worker registered for /${orgSlug}/`, registration);
    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
    }
  }
};
