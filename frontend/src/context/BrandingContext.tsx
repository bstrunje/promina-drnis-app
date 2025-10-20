/**
 * BRANDING CONTEXT PROVIDER
 * 
 * Upravlja dinamičkim učitavanjem i cache-iranjem branding podataka organizacije
 * Automatski detektira tenant po subdomeni i učitava odgovarajući branding
 */

import React, { useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import apiClient from '../utils/api/apiConfig';
import { useTranslation } from 'react-i18next';
import { updateManifestLink, updateThemeColor, updatePageMeta } from '../utils/pwaUtils';
import { BrandingContext, type OrganizationBranding, type BrandingContextType } from './brandingContextObject';

// Cache ključ za localStorage
const BRANDING_CACHE_KEY = 'organization_branding';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minuta

interface CachedBranding {
  data: OrganizationBranding;
  timestamp: number;
  tenant: string;
}

/**
 * Detektira tenant iz URL-a
 * PRIORITET:
 * 1. URL Path (/promina/...) - path-based routing
 * 2. Query parameter (?tenant=promina) - development override
 * 3. Subdomain (promina.managemembers.com) - legacy fallback
 * 4. localStorage cache
 */
const getTenantFromUrl = (): string => {
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;

  // System Manager rute ne koriste branding – preskačemo u potpunosti
  if (pathname.startsWith('/system-manager')) {
    console.log('[BRANDING] System Manager route - skipping tenant detection');
    return 'skip';
  }
  
  console.log('[BRANDING] 🔍 Detecting tenant from URL');
  console.log('[BRANDING] 🔍 Hostname:', hostname, 'Pathname:', pathname);
  
  // 1. Pokušaj iz URL path-a (PRIORITET!)
  if (pathname && pathname !== '/') {
    const cleanPath = pathname.startsWith('/') ? pathname.substring(1) : pathname;
    const parts = cleanPath.split('/');
    
    if (parts.length > 0) {
      const pathSlug = parts[0];
      
      // Izuzeci - samo infrastrukturne rute koje nisu org slugovi
      // SVE ostale rute MORAJU biti pod organizacijom (/{orgSlug}/...)
      const excludedPrefixes = [
        'api',           // Backend API pozivi
        'uploads',       // Statički resursi
        'health',        // Health check endpoint
        'system-manager' // Globalni System Manager (jedinstvena iznimka)
      ];
      const validSlugRegex = /^[a-z0-9-]+$/;
      
      if (!excludedPrefixes.includes(pathSlug) && validSlugRegex.test(pathSlug)) {
        console.log('[BRANDING] ✅ Detected tenant from path:', pathSlug);
        localStorage.setItem('current_tenant', pathSlug);
        return pathSlug;
      }
    }
  }
  
  // 2. Query parameter (development override)
  const urlParams = new URLSearchParams(window.location.search);
  const tenantParam = urlParams.get('tenant') ?? urlParams.get('branding');
  if (tenantParam) {
    console.log('[BRANDING] ✅ Detected tenant from query:', tenantParam);
    localStorage.setItem('current_tenant', tenantParam);
    return tenantParam;
  }
  
  // 3. Subdomain (legacy/fallback)
  if (!hostname.includes('localhost') && !hostname.includes('127.0.0.1')) {
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      const subdomain = parts[0];
      console.log('[BRANDING] ✅ Detected tenant from subdomain:', subdomain);
      localStorage.setItem('current_tenant', subdomain);
      return subdomain;
    }
  }
  
  // 4. localStorage cache
  const cached = localStorage.getItem('current_tenant');
  if (cached) {
    console.log('[BRANDING] ✅ Using cached tenant:', cached);
    return cached;
  }
  
  console.log('[BRANDING] ⚠️  No tenant detected');
  return 'missing';
};

/**
 * Dohvaća branding iz cache-a ako je valjan
 */
const getCachedBranding = (tenant: string): OrganizationBranding | null => {
  try {
    const cached = localStorage.getItem(BRANDING_CACHE_KEY);
    if (!cached) return null;
    
    const parsedCache = JSON.parse(cached) as CachedBranding;
    const now = Date.now();
    
    // Provjeri je li cache valjan (isti tenant i nije expired)
    if (
      parsedCache.tenant === tenant &&
      (now - parsedCache.timestamp) < CACHE_DURATION
    ) {
      return parsedCache.data;
    }
    
    // Cache je expired ili za drugi tenant
    localStorage.removeItem(BRANDING_CACHE_KEY);
    return null;
  } catch (error) {
    console.warn('Greška pri čitanju branding cache-a:', error);
    localStorage.removeItem(BRANDING_CACHE_KEY);
    return null;
  }
};

/**
 * Sprema branding u cache
 */
const setCachedBranding = (branding: OrganizationBranding, tenant: string): void => {
  try {
    const cacheData: CachedBranding = {
      data: branding,
      timestamp: Date.now(),
      tenant: tenant
    };
    localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Greška pri spremanju branding cache-a:', error);
  }
};

// Tipovi za API odgovor
interface RawBranding {
  id: number;
  name: string;
  subdomain: string;
  short_name?: string | null;
  is_active?: boolean | null;
  logo_path?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  default_language?: string;
  email?: string | null;
  phone?: string | null;
  website_url?: string | null;
  street_address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
  ethics_code_url?: string | null;
  privacy_policy_url?: string | null;
  membership_rules_url?: string | null;
}

interface ApiSuccessWrapper {
  success?: boolean;
  data?: RawBranding;
}

/**
 * Branding Provider komponenta
 */
export const BrandingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { i18n } = useTranslation();
  const [branding, setBranding] = useState<OrganizationBranding | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenant, setTenant] = useState(getTenantFromUrl());
  
  // Očisti stari cache pri mount-u ako je tenant različit
  useEffect(() => {
    const currentTenant = getTenantFromUrl();
    if (currentTenant !== 'skip' && currentTenant !== 'missing') {
      try {
        const cachedStr = localStorage.getItem(BRANDING_CACHE_KEY);
        const cachedTenantStr = localStorage.getItem('current_tenant');
        if (cachedStr) {
          const cachedData = JSON.parse(cachedStr) as CachedBranding;
          if (cachedData.tenant !== currentTenant || (cachedTenantStr && cachedTenantStr !== currentTenant)) {
            console.log('[BRANDING] 🗑️  Brišem stari cache pri inicijalizaciji - stari tenant:', cachedData.tenant, '/', cachedTenantStr, 'novi:', currentTenant);
            localStorage.removeItem(BRANDING_CACHE_KEY);
            setBranding(null); // Force reload
          }
        }
      } catch (e) {
        console.warn('[BRANDING] Greška pri inicijalnoj provjeri cache-a:', e);
        localStorage.removeItem(BRANDING_CACHE_KEY);
      }
    }
    // Izvršava se samo jednom pri mount-u
  }, []);

  /**
   * Učitava branding podatke s API-ja
   */
  const loadBranding = async (): Promise<void> => {
    try {
      console.log('[BRANDING] 🚀 Pokretanje loadBranding za tenant:', tenant);
      setIsLoading(true);
      setError(null);
      
      // Preskoči u potpunosti na System Manager rutama
      if (tenant === 'skip') {
        setBranding(null);
        setIsLoading(false);
        return;
      }
      
      // Sigurnosno: ako tenant nedostaje, ne učitavaj branding
      // U multi-tenant konfiguraciji, root path (/) prikazuje TenantSelector
      if (tenant === 'missing') {
        setBranding(null);
        setIsLoading(false);
        return;
      }
      
      // Provjeri je li cached branding za DRUGI tenant - ako je, obriši ga
      try {
        const cachedStr = localStorage.getItem(BRANDING_CACHE_KEY);
        if (cachedStr) {
          const cachedData = JSON.parse(cachedStr) as CachedBranding;
          if (cachedData.tenant !== tenant) {
            console.log('[BRANDING] 🗑️  Brišem stari cache za tenant:', cachedData.tenant);
            localStorage.removeItem(BRANDING_CACHE_KEY);
          }
        }
      } catch (e) {
        console.warn('[BRANDING] Greška pri provjeri cache-a:', e);
        localStorage.removeItem(BRANDING_CACHE_KEY);
      }
      
      // Provjeri cache
      const cached = getCachedBranding(tenant);
      console.log('[BRANDING] 💾 Cache provjera:', cached ? 'HIT' : 'MISS');
      if (cached) {
        console.log('[BRANDING] ✅ Koristi cached podatke:', cached);
        setBranding(cached);
        
        // Ažuriraj PWA manifest i meta tagove i za cached branding
        updateManifestLink();
        if (cached.primary_color) {
          updateThemeColor(cached.primary_color);
        }
        updatePageMeta(cached.name);
        
        setIsLoading(false);
        return;
      }
      
      // Učitaj s API-ja (koristi puni org-config kako bismo dobili i dokumente)
      console.log('[BRANDING] 🌐 Pozivam API:', '/org-config', 'tenant:', tenant);
      const response = await apiClient.get<ApiSuccessWrapper | RawBranding>(
        '/org-config',
        { params: { tenant } }
      );
      const payload = response.data;
      console.log('[BRANDING] 📥 API response:', payload);

      // Podržavamo oba formata: { success, data } ili direktni objekt
      const maybeWrapped = payload as ApiSuccessWrapper;
      const raw: RawBranding = (typeof maybeWrapped.data !== 'undefined' && maybeWrapped.data !== null)
        ? maybeWrapped.data
        : (payload as RawBranding);

      // Normaliziraj u OrganizationBranding
      const brandingData: OrganizationBranding = {
        id: raw.id,
        name: raw.name,
        subdomain: raw.subdomain,
        short_name: raw.short_name ?? '',
        is_active: (raw.is_active ?? true),
        logo_path: raw.logo_path ?? null,
        primary_color: raw.primary_color ?? null,
        secondary_color: raw.secondary_color ?? null,
        default_language: raw.default_language ?? 'hr',
        email: raw.email ?? null,
        phone: raw.phone ?? null,
        website_url: raw.website_url ?? null,
        street_address: raw.street_address ?? null,
        city: raw.city ?? null,
        postal_code: raw.postal_code ?? null,
        country: raw.country ?? null,
        ethics_code_url: raw.ethics_code_url ?? null,
        privacy_policy_url: raw.privacy_policy_url ?? null,
        membership_rules_url: raw.membership_rules_url ?? null,
      };
      
      // Spremi u state i cache
      setBranding(brandingData);
      setCachedBranding(brandingData, tenant);
      
      // Ažuriraj PWA manifest i meta tagove
      updateManifestLink();
      if (brandingData.primary_color) {
        updateThemeColor(brandingData.primary_color);
      }
      updatePageMeta(brandingData.name);
      
    } catch (err) {
      console.error('Greška pri učitavanju branding podataka:', err);
      setError('Nije moguće učitati podatke organizacije');
      
      // U multi-tenant konfiguraciji ne postavljamo fallback branding
      // Komponente trebaju gracefully handleati null branding
      setBranding(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Javna funkcija za refresh branding-a
   */
  const refreshBranding = async (): Promise<void> => {
    // Ukloni cache i učitaj ponovno
    localStorage.removeItem(BRANDING_CACHE_KEY);
    await loadBranding();
  };

  // Prati promjene URL-a kroz React Router location i ažuriraj tenant
  useEffect(() => {
    const newTenant = getTenantFromUrl();
    if (newTenant !== tenant) {
      console.log('[BRANDING] 🔄 URL promjena detektirana, novi tenant:', newTenant);
      setTenant(newTenant);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);

  // Učitaj branding pri mount-u i promjeni tenant-a
  useEffect(() => {
    void loadBranding();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant]);

  // Postavi CSS varijable i jezik kad se branding učita
  useEffect(() => {
    if (branding) {
      const root = document.documentElement;
      
      // Postavi CSS varijable za boje
      if (branding.primary_color) {
        root.style.setProperty('--primary-color', branding.primary_color);
      }
      if (branding.secondary_color) {
        root.style.setProperty('--secondary-color', branding.secondary_color);
      }
      
      // Postavi page title
      document.title = branding.name;
      
      // Postavi data-tenant atribut za CSS selektore
      document.body.setAttribute('data-tenant', branding.subdomain);

      // Automatski postavi jezik prema organizaciji
      if (branding.default_language && i18n.language !== branding.default_language) {
        console.log(`[BRANDING] Postavljam jezik na: ${branding.default_language}`);
        void i18n.changeLanguage(branding.default_language);
      }
    }
  }, [branding, i18n]);

  const contextValue: BrandingContextType = {
    branding,
    isLoading,
    error,
    refreshBranding,
    tenant
  };

  return (
    <BrandingContext.Provider value={contextValue}>
      {children}
    </BrandingContext.Provider>
  );
};

// Re-export tipova za backward compatibility
export type { OrganizationBranding, BrandingContextType } from './brandingContextObject';
