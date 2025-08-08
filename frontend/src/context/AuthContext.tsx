// frontend/src/context/AuthContext.tsx
import React, { useState, ReactNode, useEffect } from "react";
import { Member } from "@shared/member";
import { tokenStorage } from '../utils/auth/tokenStorage';
import { setupAxiosInterceptors } from '../utils/auth/axiosInterceptors';
import { AuthTokenService } from '../utils/auth/AuthTokenService';
import { useNavigate } from 'react-router-dom';
import { setNavigateInstance } from '../utils/auth/navigationHelper';
import { AuthContext, AuthContextType } from './authContextObject';

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

  // Funkcija za odjavu korisnika - koristi AuthTokenService
  // Ne radimo preusmjeravanje ovdje jer to radi App.tsx
  const logout = React.useCallback(async () => {
    try {
      // Spremimo trenutnu putanju u slučaju da je kasnije trebamo
      if (window?.location && window.location.pathname !== '/' && window.location.pathname !== '/login') {
        sessionStorage.setItem('lastPath', window.location.pathname);
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
    }
  }, []);
  
  // Nova funkcija za soft-logout - ne briše token odmah
  const softLogout = React.useCallback(() => {
    try {
      // Spremi trenutnu putanju za kasnije preusmjeravanje
      const currentPath = window.location.pathname;
      if (currentPath !== '/' && currentPath !== '/login') {
        setLastPath(currentPath);
        // Također spremamo u sessionStorage za slučaj osvježavanja stranice
        sessionStorage.setItem('lastPath', currentPath);
      }
      
      // Postavi korisnika na null, ali ne briši token još
      setUser(null);
      
      // Preusmjeri na login stranicu s query parametrom koji kaže da je soft-logout
      navigate(`/login?soft=true&redirect=${encodeURIComponent(currentPath)}`);
    } catch {
      // U slučaju greške, napravi puni logout
      void logout();
    }
  }, [navigate, logout]);


  // Funkcija za obnavljanje tokena - koristi AuthTokenService s retry mehanizmom
  const refreshToken = React.useCallback(async (): Promise<string | null> => {
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

  // Inicijalizacija stanja iz localStorage i provjera valjanosti tokena
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        const savedUser = localStorage.getItem("user");
        const savedToken = tokenStorage.getAccessToken();
        
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
            setUser({
              ...parsedUser,
              registration_completed: !!(parsedUser).registration_completed,
            });
          } else {
            setUser(null);
          }
          setToken(savedToken);
          
          // Pokušaj osvježiti token kako bi provjerili je li još valjan
          try {
            const newToken = await refreshToken();
            
            if (!newToken) {
              // VAŽNA PROMJENA: Ne čistimo odmah stanje korisnika, postavljamo timer
              // koji će pokušati ponovno osvježiti token kasnije
              setTimeout(() => {
                void refreshToken();
              }, 5000);  // Pokušaj ponovno nakon 5 sekundi
            } else {
              // Pokreni automatsko osvježavanje tokena
              AuthTokenService.startAutoRefresh();
            }
          } catch {
            // VAŽNA PROMJENA: Ne čistimo odmah stanje, postavljamo flag da je token možda nevažeći
          }
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