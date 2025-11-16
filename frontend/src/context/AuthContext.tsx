// frontend/src/context/AuthContext.tsx
import React, { useState, ReactNode, useEffect } from "react";
import { Member } from "@shared/member";
import { tokenStorage } from '../utils/auth/tokenStorage';
import { setupAxiosInterceptors } from '../utils/auth/axiosInterceptors';
import { AuthTokenService } from '../utils/auth/AuthTokenService';
import { useNavigate } from 'react-router-dom';
import { setNavigateInstance } from '../utils/auth/navigationHelper';
import { AuthContext, AuthContextType } from './authContextObject';
import { extractOrgSlugFromPath } from '../utils/tenantUtils';

// Tip premješten u 'context/authContextObject.ts'

// Objekt konteksta je izdvojen u 'context/authContextObject.ts'

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<Member | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastPath, setLastPath] = useState<string | null>(null);
  const navigate = useNavigate();
  // Injektiraj navigate u globalni helper za SPA redirect izvan React konteksta
  React.useEffect(() => { setNavigateInstance(navigate); }, [navigate]);

  // Flag-ovi za sprječavanje višestrukih poziva (race condition na mobitelu)
  const isLoggingOut = React.useRef(false);
  const isRefreshing = React.useRef(false);

  // Funkcija za odjavu korisnika - koristi AuthTokenService
  const logout = React.useCallback(async () => {
    // Sprječava višestruke logout pozive (race condition na mobitelu)
    if (isLoggingOut.current) {
      if (import.meta.env.DEV) console.log('[AUTH] Logout već u tijeku, preskačem...');
      return;
    }
    
    isLoggingOut.current = true;
    try {
      // Provjeri da li je trenutna putanja login stranica
      const orgSlug = extractOrgSlugFromPath();
      const loginPath = orgSlug ? `/${orgSlug}/login` : '/login';
      
      // Spremimo trenutnu putanju sa query parametrima u slučaju da je kasnije trebamo
      if (window?.location && window.location.pathname !== '/' && window.location.pathname !== loginPath) {
        const fullPath = window.location.pathname + window.location.search;
        sessionStorage.setItem('lastPath', fullPath);
      }
      
      // Pozovi backend za odjavu
      await AuthTokenService.logout();
    } catch {
      // Tihi fallback: backend odjava nije uspjela
    } finally {
      // Lokalno brisanje podataka o korisniku
      setUser(null);
      setToken(null);
      localStorage.removeItem("user");
      localStorage.removeItem("userRole");
      // Briši cached branding, ali NE current_tenant (potreban je za login)
      localStorage.removeItem("organization_branding");
      // Napomena: current_tenant se NE briše jer označava na kojoj organizaciji/subdomeni se korisnik nalazi,
      // a ne autentifikacijske podatke. Potreban je za ispravan prikaz login forme.
      
      // KRITIČNO: Redirect na login nakon logout-a
      // Ovo je potrebno jer axios interceptor poziva logout() kada refresh token faila
      const orgSlug = extractOrgSlugFromPath();
      const loginPath = orgSlug ? `/${orgSlug}/login` : '/login';
      if (window.location.pathname !== loginPath) {
        navigate(loginPath);
      }
      
      // Reset flag-a nakon redirect-a (setTimeout osigurava da se redirect izvrši prvo)
      setTimeout(() => {
        isLoggingOut.current = false;
      }, 1000);
    }
  }, [navigate]);
  
  // Nova funkcija za soft-logout - ne briše token odmah
  const softLogout = React.useCallback(() => {
    try {
      // Dohvati org slug za provjeru login path-a i preusmjeravanje
      const orgSlug = extractOrgSlugFromPath();
      const loginPath = orgSlug ? `/${orgSlug}/login` : '/login';
      
      // Spremi trenutnu putanju sa query parametrima za kasnije preusmjeravanje
      const currentPath = window.location.pathname + window.location.search;
      if (window.location.pathname !== '/' && window.location.pathname !== loginPath) {
        setLastPath(currentPath);
        // Također spremamo u sessionStorage za slučaj osvježavanja stranice
        sessionStorage.setItem('lastPath', currentPath);
      }
      
      // Postavi korisnika na null, ali ne briši token još
      setUser(null);
      
      // Preusmjeri na login stranicu s query parametrom koji kaže da je soft-logout
      navigate(`${loginPath}?soft=true&redirect=${encodeURIComponent(currentPath)}`);
    } catch {
      // U slučaju greške, napravi puni logout
      void logout();
    }
  }, [navigate, logout]);


  // Funkcija za obnavljanje tokena - koristi AuthTokenService s retry mehanizmom
  const refreshToken = React.useCallback(async (): Promise<string | null> => {
    // Sprječava višestruke refresh pokušaje (race condition na mobitelu)
    if (isRefreshing.current) {
      if (import.meta.env.DEV) console.log('[AUTH] Refresh već u tijeku, preskačem...');
      return null;
    }
    
    isRefreshing.current = true;
    try {
      const newToken = await AuthTokenService.refreshToken();
      
      if (newToken) {
        setToken(newToken);
        return newToken;
      }
      
      // Ako nije uspjelo osvježavanje, NE čistimo odmah stanje korisnika
      // Ovo je ključna promjena koja će spriječiti automatsko odjavljivanje
      return null;
    } catch {
      return null;
    } finally {
      // Reset flag-a nakon što refresh završi
      setTimeout(() => {
        isRefreshing.current = false;
      }, 500);
    }
  }, []);

  // Funkcija za prijavu korisnika
  const login = React.useCallback((user: Member, token: string, refreshToken?: string) => {
    setUser(user);
    setToken(token);
    localStorage.setItem("user", JSON.stringify(user));
    tokenStorage.storeAccessToken(token);
    if (refreshToken) {
      tokenStorage.storeRefreshToken(refreshToken);
    }
    
    // Pokreni automatsko osvježavanje tokena
    AuthTokenService.startAutoRefresh();
  }, []);

  // Funkcija za ažuriranje user objekta
  const updateUser = React.useCallback((updatedUser: Member) => {
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
  }, []);

  // Inicijalizacija stanja iz localStorage i provjera valjanosti tokena
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        // KRITIČNO: Ako je ovo SystemManager ruta, ne provjeravaj Member auth
        const currentPath = window.location.pathname;
        if (import.meta.env.DEV) console.log('[AUTH] Checking auth for path:', currentPath);
        
        if (currentPath.includes('/system-manager')) {
          if (import.meta.env.DEV) console.log('[AUTH] SystemManager ruta detektirana, preskačem Member auth check');
          setIsLoading(false);
          return;
        }
        
        // PRIMARY KEY: "user"; FALLBACK: legacy ključ "member"
        const primaryUser = localStorage.getItem("user");
        const legacyMember = !primaryUser ? localStorage.getItem("member") : null;
        const savedUser = primaryUser ?? legacyMember;
        const cachedTenant = localStorage.getItem("current_tenant");
        
        const savedToken = tokenStorage.getAccessToken();
        
        // Ako postoji korisnik u localStorage-u, ali NEMA access tokena,
        // tretiramo to kao istek/nekonzistentnu sesiju i radimo puni logout.
        if (savedUser && !savedToken) {
          try {
            await AuthTokenService.logout();
          } catch {
            // Tihi fallback: i ako backend logout padne, nastavljamo s lokalnim čišćenjem
          }
          setUser(null);
          setToken(null);
          return;
        }

        if (savedUser && savedToken) {
          // Postavljamo privremeno stanje korisnika i tokena
          let parsedUser: unknown;
          try {
            parsedUser = JSON.parse(savedUser);
          } catch {
            parsedUser = null;
          }

          // Type guard za Member
          const isMember = (obj: unknown): obj is Member => {
            if (!obj || typeof obj !== 'object') return false;
            return 'member_id' in obj && 'first_name' in obj;
          };

          if (parsedUser && isMember(parsedUser)) {
            // MULTI-TENANCY VALIDACIJA: Provjeri da li tenant odgovara
            // (ne možemo garantirati da će uvijek imati organization podatke, pa samo upozoravamo)
            if (cachedTenant) {
              if (import.meta.env.DEV) console.log('[AUTH] Cached tenant:', cachedTenant, '| User loaded from localStorage');
            }
            
            // NORMALIZACIJA: ako je korisnik učitan iz legacy "member" ključa, spremi ga i pod "user"
            try {
              if (!primaryUser) {
                localStorage.setItem("user", savedUser);
              }
            } catch {
              // Tihi fallback: ako localStorage set zakaže, nastavljamo s in-memory stanjem
            }

            setUser({
              ...parsedUser,
              registration_completed: !!(parsedUser).registration_completed,
            });
          } else {
            setUser(null);
          }
          setToken(savedToken);
          
          // Pokreni automatsko osvježavanje tokena
          AuthTokenService.startAutoRefresh();
          
          // Ne blokiramo inicijalni render čekanjem na refresh;
          // eventualno osvježavanje radimo u pozadini.
          void refreshToken();
        }
      } catch {
        // Tihi fallback: ne prekidamo inicijalizaciju ako localStorage/dohvat korisnika padne
      } finally {
        setIsLoading(false);
      }
    };
    
    void checkAuth();
  }, [refreshToken]);

  // Postavljanje axios interceptora za automatsko obnavljanje tokena
  useEffect(() => {
    // Koristimo utility funkciju za postavljanje interceptora
    const cleanup = setupAxiosInterceptors(token, refreshToken, logout);
    
    // Čišćenje interceptora pri unmount-u
    return cleanup;
  }, [token, refreshToken, logout]); // Ponovno postavi interceptore kada se token, logout ili refreshToken promijeni

  // Vrijednosti koje se pružaju kroz context
  const contextValue: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user,
    login,
    logout,
    refreshToken,
    updateUser,
    isLoading,
    softLogout,
    lastPath,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

// Ova datoteka izvozi SAMO komponentu (radi react-refresh pravila)
export default AuthProvider;