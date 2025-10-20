import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import { extractOrgSlugFromPath } from '../utils/tenantUtils';

/**
 * Hook za navigaciju koja automatski dodaje org prefix
 * Koristi se za member i admin strane
 */
export const useTenantNavigation = () => {
  const navigate = useNavigate();

  /**
   * Navigira na rutu s automatskim dodavanjem org prefix-a
   * Podržava i brojeve za back/forward navigaciju (npr. -1 za natrag)
   */
  const navigateTo = useCallback((path: string | number, options?: { replace?: boolean }) => {
    // Ako je broj (npr. -1 za back), navigiraj direktno
    if (typeof path === 'number') {
      navigate(path);
      return;
    }
    
    // Dohvati org slug iz trenutnog URL-a
    const orgSlug = extractOrgSlugFromPath();
    
    // Ako path već ima org slug ili ako nema org slug-a, navigiraj direktno
    if (!orgSlug || path.startsWith(`/${orgSlug}/`)) {
      navigate(path, options);
      return;
    }
    
    // Dodaj org prefix
    const prefixedPath = `/${orgSlug}${path}`;
    console.log(`[TENANT-NAVIGATION] Adding org prefix: ${path} → ${prefixedPath}`);
    navigate(prefixedPath, options);
  }, [navigate]);

  return { navigateTo };
};
