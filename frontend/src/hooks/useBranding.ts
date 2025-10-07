/**
 * BRANDING HOOK
 * 
 * Convenience hook koji exportira branding funkcionalnosti
 * i dodatne utility funkcije za rad s branding podacima
 */

import { useBranding as useBaseBranding } from '../context/BrandingContext';
import { IMAGE_BASE_URL } from '../utils/config';

/**
 * Extended branding hook s dodatnim utility funkcijama
 */
export const useBranding = () => {
  const brandingContext = useBaseBranding();
  
  /**
   * Dohvaća logo URL ili null ako nema loga
   */
  const getLogoUrl = (): string | null => {
    if (brandingContext.branding?.logo_path) {
      const logoPath = brandingContext.branding.logo_path;
      
      // Ako je puni URL (Vercel Blob), koristi direktno
      if (logoPath.startsWith('http')) {
        return logoPath;
      }
      
      // Ako je relativan path, dodaj IMAGE_BASE_URL
      if (logoPath.startsWith('/uploads')) {
        return `${IMAGE_BASE_URL}${logoPath.replace('/uploads', '')}`;
      }
      
      // Fallback za stare formate
      return logoPath;
    }
    
    // Nema loga - vrati null
    return null;
  };

  /**
   * Dohvaća primary boju ili neutralnu crnu
   */
  const getPrimaryColor = (): string => {
    return brandingContext.branding?.primary_color ?? '#000000';
  };

  /**
   * Dohvaća secondary boju ili neutralnu sivu
   */
  const getSecondaryColor = (): string => {
    return brandingContext.branding?.secondary_color ?? '#e2e4e9';
  };

  /**
   * Dohvaća kratki naziv organizacije ili null
   */
  const getShortName = (): string | null => {
    return brandingContext.branding?.short_name ?? null;
  };

  /**
   * Dohvaća puni naziv organizacije ili null
   */
  const getFullName = (): string | null => {
    return brandingContext.branding?.name ?? null;
  };

  /**
   * Dohvaća kontakt email ili null
   */
  const getContactEmail = (): string | null => {
    return brandingContext.branding?.email ?? null;
  };

  /**
   * Dohvaća kontakt telefon
   */
  const getContactPhone = (): string | null => {
    return brandingContext.branding?.phone ?? null;
  };

  /**
   * Dohvaća website URL
   */
  const getWebsiteUrl = (): string | null => {
    return brandingContext.branding?.website_url ?? null;
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
    return brandingContext.branding?.ethics_code_url ?? null;
  };

  /**
   * Dohvaća URL za pravila privatnosti
   */
  const getPrivacyPolicyUrl = (): string | null => {
    return brandingContext.branding?.privacy_policy_url ?? null;
  };

  /**
   * Dohvaća URL za pravila članstva
   */
  const getMembershipRulesUrl = (): string | null => {
    return brandingContext.branding?.membership_rules_url ?? null;
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