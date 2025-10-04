/**
 * BRANDING CONTEXT PROVIDER
 * 
 * Upravlja dinamičkim učitavanjem i cache-iranjem branding podataka organizacije
 * Automatski detektira tenant po subdomeni i učitava odgovarajući branding
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiClient } from '../utils/api';

// Tipovi za branding podatke
export interface OrganizationBranding {
  id: number;
  name: string;
  subdomain: string;
  short_name: string;
  is_active: boolean;
  logo_path: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  email: string;
  phone: string | null;
  website_url: string | null;
  street_address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  ethics_code_url: string | null;
  privacy_policy_url: string | null;
  membership_rules_url: string | null;
}

interface BrandingContextType {
  branding: OrganizationBranding | null;
  isLoading: boolean;
  error: string | null;
  refreshBranding: () => Promise<void>;
  tenant: string;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

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
 */
const getTenantFromUrl = (): string => {
  const hostname = window.location.hostname;
  console.log('[BRANDING] 🔍 Detecting tenant from hostname:', hostname);
  
  // Development - localhost
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    // Možemo koristiti query parameter za testiranje: ?tenant=test
    const urlParams = new URLSearchParams(window.location.search);
    const tenantParam = urlParams.get('tenant');
    console.log('[BRANDING] 🔍 Query param tenant:', tenantParam);
    if (tenantParam) {
      console.log('[BRANDING] ✅ Detected tenant from query:', tenantParam);
      return tenantParam;
    }
    
    console.log('[BRANDING] ✅ Using default tenant: promina');
    return 'promina'; // Default za development
  }
  
  // Production - subdomena
  const parts = hostname.split('.');
  if (parts.length >= 2) {
    const subdomain = parts[0];
    console.log('[BRANDING] ✅ Detected tenant from subdomain:', subdomain);
    return subdomain; // Prvi dio je subdomena
  }
  
  console.log('[BRANDING] ✅ Using fallback tenant: promina');
  return 'promina'; // Fallback
};

/**
 * Dohvaća branding iz cache-a ako je valjan
 */
const getCachedBranding = (tenant: string): OrganizationBranding | null => {
  try {
    const cached = localStorage.getItem(BRANDING_CACHE_KEY);
    if (!cached) return null;
    
    const parsedCache: CachedBranding = JSON.parse(cached);
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

/**
 * Branding Provider komponenta
 */
export const BrandingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<OrganizationBranding | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenant] = useState(() => getTenantFromUrl());

  /**
   * Učitava branding podatke s API-ja
   */
  const loadBranding = async (): Promise<void> => {
    try {
      console.log('[BRANDING] 🚀 Pokretanje loadBranding za tenant:', tenant);
      setIsLoading(true);
      setError(null);
      
      // Provjeri cache prvo
      const cached = getCachedBranding(tenant);
      console.log('[BRANDING] 💾 Cache provjera:', cached ? 'HIT' : 'MISS');
      if (cached) {
        console.log('[BRANDING] ✅ Koristi cached podatke:', cached);
        setBranding(cached);
        setIsLoading(false);
        return;
      }
      
      // Učitaj s API-ja
      console.log('[BRANDING] 🌐 Pozivam API:', '/org-config/branding');
      const response = await apiClient.get('/org-config/branding');
      console.log('[BRANDING] 📥 API response:', response.data);
      const brandingData: OrganizationBranding = response.data;
      
      // Spremi u state i cache
      setBranding(brandingData);
      setCachedBranding(brandingData, tenant);
      
    } catch (err) {
      console.error('Greška pri učitavanju branding podataka:', err);
      setError('Nije moguće učitati podatke organizacije');
      
      // Fallback na default branding
      const fallbackBranding: OrganizationBranding = {
        id: 1,
        name: 'Planinarska Organizacija',
        subdomain: tenant,
        short_name: 'PO',
        is_active: true,
        logo_path: null,
        primary_color: '#2563eb',
        secondary_color: '#64748b',
        email: 'info@example.com',
        phone: null,
        website_url: null,
        street_address: null,
        city: null,
        postal_code: null,
        country: null,
        ethics_code_url: null,
        privacy_policy_url: null,
        membership_rules_url: null,
      };
      setBranding(fallbackBranding);
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

  // Učitaj branding pri mount-u
  useEffect(() => {
    loadBranding();
  }, [tenant]);

  // Postavi CSS varijable kad se branding učita
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
    }
  }, [branding]);

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

/**
 * Hook za korištenje branding context-a
 */
export const useBranding = (): BrandingContextType => {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};

export default BrandingContext;
