/**
 * PWA UTILITIES
 * 
 * Utility funkcije za dinamičku konfiguraciju PWA-a prema tenant-u
 */

import { extractOrgSlugFromPath } from './tenantUtils';
import { API_BASE_URL } from './config';

/**
 * Dodaje ili ažurira <link rel="manifest"> tag u <head>
 * Manifest URL se generira dinamički na temelju tenant-a
 */
export const updateManifestLink = (): void => {
  try {
    // PRVO provjeri je li System Manager stranica - prije bilo čega drugog
    const currentPath = window.location.pathname;
    if (currentPath.includes('/system-manager/')) {
      console.log('[PWA] System Manager detected - removing any existing manifest link');
      // Ukloni postojeći manifest link ako postoji
      const existingLink = document.querySelector('link[rel="manifest"]');
      if (existingLink) {
        existingLink.remove();
        console.log('[PWA] Manifest link removed for System Manager');
      }
      return;
    }

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
    // Dodaj cache-buster parametar da forsira osvježavanje manifesta/ikona kad se promijeni branding
    const cacheBust = Date.now();
    manifestLink.href = `${API_BASE_URL}/manifest?tenant=${orgSlug}&v=${cacheBust}`;
    
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
    // Preskači PWA za System Manager stranice
    const currentPath = window.location.pathname;
    if (currentPath.includes('/system-manager/')) {
      console.log('[PWA] System Manager detected - skipping theme color update');
      return;
    }
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
    // Preskači PWA za System Manager stranice
    const currentPath = window.location.pathname;
    if (currentPath.includes('/system-manager/')) {
      console.log('[PWA] System Manager detected - skipping page meta update');
      return;
    }
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
 * NAPOMENA: Service Worker se registrira u main.tsx na root scope (/)
 * Ova funkcija je uklonjena jer koristimo jedan SW za sve organizacije
 */
