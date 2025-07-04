// navigationHelper.ts
// Omogućuje globalni pristup navigate funkciji React Routera izvan React komponenti

import { NavigateFunction } from 'react-router-dom';

let navigateInstance: NavigateFunction | null = null;

export function setNavigateInstance(navigate: NavigateFunction) {
  // console.log('[navigationHelper.setNavigateInstance] navigateInstance postavljen.');
  navigateInstance = navigate;
}

export function navigateToLogin(options?: { replace?: boolean }) {
  // console.log('[navigationHelper.navigateToLogin] Pozvan.');
  if (navigateInstance) {
    // console.log('[navigationHelper.navigateToLogin] navigateInstance postoji, pozivam navigate("/login").');
    navigateInstance('/login', { replace: true, ...options });
    return true;
  } else {
    // console.warn('[navigationHelper.navigateToLogin] navigateInstance NIJE postavljen! Koristim window.location.replace.');
    // Fallback na klasični redirect
    window.location.replace('/login');
    return false;
  }
}
