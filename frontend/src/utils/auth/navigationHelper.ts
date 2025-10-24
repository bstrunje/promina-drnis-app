// navigationHelper.ts
// Omogućuje globalni pristup navigate funkciji React Routera izvan React komponenti

import { NavigateFunction } from 'react-router-dom';
import { extractOrgSlugFromPath } from '../tenantUtils';

let navigateInstance: NavigateFunction | null = null;

export function setNavigateInstance(navigate: NavigateFunction) {
  // console.log('[navigationHelper.setNavigateInstance] navigateInstance postavljen.');
  navigateInstance = navigate;
}

export function navigateToLogin(options?: { replace?: boolean }) {
  // Dohvati org slug iz trenutnog URL-a
  const orgSlug = extractOrgSlugFromPath();
  const loginPath = orgSlug ? `/${orgSlug}/login` : '/login';
  
  if (navigateInstance) {
    navigateInstance(loginPath, { replace: true, ...options });
    return true;
  } else {
    // Fallback na klasični redirect
    window.location.replace(loginPath);
    return false;
  }
}
