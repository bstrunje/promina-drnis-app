/**
 * BRANDING HOOK
 * 
 * Convenience hook koji exportira branding funkcionalnosti
 * i dodatne utility funkcije za rad s branding podacima
 */

import { useBranding as useBaseBranding, type OrganizationBranding } from '../contexts/BrandingContext';

/**
 * Extended branding hook s dodatnim utility funkcijama
 */
export const useBranding = () => {
  const brandingContext = useBaseBranding();
  
  /**
   * Dohvaća logo URL ili fallback
   */
  const getLogoUrl = (): string => {
    if (brandingContext.branding?.logo_path) {
      // Ako je logo_path relativan, dodaj base URL
      if (brandingContext.branding.logo_path.startsWith('/')) {
        return brandingContext.branding.logo_path;
      }
      // Ako je puni URL, koristi direktno
      if (brandingContext.branding.logo_path.startsWith('http')) {
        return brandingContext.branding.logo_path;
      }
      // Inače, tretirati kao relativan path
      return `/uploads/logos/${brandingContext.branding.logo_path}`;
    }
    
    // Fallback logo
    return '/assets/default-logo.svg';
  };

  /**
   * Dohvaća primary boju ili fallback
   */
  const getPrimaryColor = (): string => {
    return brandingContext.branding?.primary_color || '#2563eb';
  };

  /**
   * Dohvaća secondary boju ili fallback
   */
  const getSecondaryColor = (): string => {
    return brandingContext.branding?.secondary_color || '#64748b';
  };

  /**
   * Dohvaća kratki naziv organizacije
   */
  const getShortName = (): string => {
    return brandingContext.branding?.short_name || 'PO';
  };

  /**
   * Dohvaća puni naziv organizacije
   */
  const getFullName = (): string => {
    return brandingContext.branding?.name || 'Planinarska Organizacija';
  };

  /**
   * Dohvaća kontakt email
   */
  const getContactEmail = (): string => {
    return brandingContext.branding?.email || 'info@example.com';
  };

  /**
   * Dohvaća kontakt telefon
   */
  const getContactPhone = (): string | null => {
    return brandingContext.branding?.phone || null;
  };

  /**
   * Dohvaća website URL
   */
  const getWebsiteUrl = (): string | null => {
    return brandingContext.branding?.website_url || null;
  };

  /**
   * Dohvaća punu adresu kao string
   */
  const getFullAddress = (): string | null => {
    const branding = brandingContext.branding;
    if (!branding) return null;

    const parts = [
      branding.street_address,
      branding.postal_code && branding.city ? `${branding.postal_code} ${branding.city}` : branding.city,
      branding.country
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(', ') : null;
  };

  /**
   * Dohvaća URL za etički kodeks
   */
  const getEthicsCodeUrl = (): string | null => {
    return brandingContext.branding?.ethics_code_url || null;
  };

  /**
   * Dohvaća URL za pravila privatnosti
   */
  const getPrivacyPolicyUrl = (): string | null => {
    return brandingContext.branding?.privacy_policy_url || null;
  };

  /**
   * Dohvaća URL za pravila članstva
   */
  const getMembershipRulesUrl = (): string | null => {
    return brandingContext.branding?.membership_rules_url || null;
  };

  /**
   * Provjera je li organizacija aktivna
   */
  const isOrganizationActive = (): boolean => {
    return brandingContext.branding?.is_active ?? true;
  };

  /**
   * Generiraj CSS style objekt za primary boju
   */
  const getPrimaryColorStyle = () => ({
    color: getPrimaryColor()
  });

  /**
   * Generiraj CSS style objekt za secondary boju
   */
  const getSecondaryColorStyle = () => ({
    color: getSecondaryColor()
  });

  /**
   * Generiraj CSS style objekt za background s primary bojom
   */
  const getPrimaryBackgroundStyle = () => ({
    backgroundColor: getPrimaryColor()
  });

  return {
    // Osnovni branding context
    ...brandingContext,
    
    // Utility funkcije
    getLogoUrl,
    getPrimaryColor,
    getSecondaryColor,
    getShortName,
    getFullName,
    getContactEmail,
    getContactPhone,
    getWebsiteUrl,
    getFullAddress,
    getEthicsCodeUrl,
    getPrivacyPolicyUrl,
    getMembershipRulesUrl,
    isOrganizationActive,
    
    // Style helpers
    getPrimaryColorStyle,
    getSecondaryColorStyle,
    getPrimaryBackgroundStyle,
  };
};

export default useBranding;
