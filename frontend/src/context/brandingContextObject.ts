/**
 * Branding Context Object
 * Izdvojen radi React Fast Refresh kompatibilnosti
 */

import { createContext } from 'react';

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
  default_language: string;
  email: string | null;
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

export interface BrandingContextType {
  branding: OrganizationBranding | null;
  isLoading: boolean;
  error: string | null;
  refreshBranding: () => Promise<void>;
  tenant: string;
}

export const BrandingContext = createContext<BrandingContextType | undefined>(undefined);
