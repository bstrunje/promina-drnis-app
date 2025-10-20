/**
 * Base hook za pristup branding context-u
 * INTERNAL USE ONLY - koristiti hooks/useBranding.ts koji dodaje dodatne utility funkcije!
 */

import { useContext } from 'react';
import { BrandingContext, type BrandingContextType } from './brandingContextObject';

export const useBrandingContext = (): BrandingContextType => {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBrandingContext must be used within a BrandingProvider');
  }
  return context;
};
