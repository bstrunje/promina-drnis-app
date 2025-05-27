// frontend/src/context/AuthContext.tsx
import React, { createContext, useState, useContext, ReactNode, useEffect } from "react";
import axios from "axios";
import { Member } from "@shared/member";
import { tokenStorage } from '../utils/auth/tokenStorage';
import { setupAxiosInterceptors } from '../utils/auth/axiosInterceptors';
import { AuthTokenService } from '../utils/auth/AuthTokenService';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: Member | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: Member, token: string, refreshToken?: string) => void;
  logout: () => void | Promise<void>;
  refreshToken: () => Promise<string | null>;
  isLoading: boolean;
  softLogout: () => void; // Dodano za 'soft logout'
  lastPath: string | null; // Dodano za praćenje posljednje putanje
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<Member | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastPath, setLastPath] = useState<string | null>(null);
  const navigate = useNavigate();

  // Funkcija za odjavu korisnika - koristi AuthTokenService
  // Ne radimo preusmjeravanje ovdje jer to radi App.tsx
  const logout = React.useCallback(async () => {
    try {
      console.log("Započinjem proces odjave korisnika...");
      
      // Spremimo trenutnu putanju u slučaju da je kasnije trebamo
      if (window?.location && window.location.pathname !== '/' && window.location.pathname !== '/login') {
        sessionStorage.setItem('lastPath', window.location.pathname);
      }
      
      // Pozovi backend za odjavu
      await AuthTokenService.logout();
    } catch (error) {
      console.error("Greška pri odjavi na backendu:", error);
    } finally {
      // Lokalno brisanje podataka o korisniku
      setUser(null);
      setToken(null);
      localStorage.removeItem("user");
      localStorage.removeItem("userRole");
      console.log("Korisnik odjavljen lokalno");
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
    } catch (error) {
      console.error("Greška pri soft-logout:", error);
      // U slučaju greške, napravi puni logout
      void logout();
    }
  }, [navigate, logout]);


  // Funkcija za obnavljanje tokena - koristi AuthTokenService s retry mehanizmom
  const refreshToken = React.useCallback(async (): Promise<string | null> => {
    try {
      console.log('Pokušavam osvježiti token...');
      const newToken = await AuthTokenService.refreshToken();
      
      if (newToken) {
        setToken(newToken);
        return newToken;
      }
      
      // Ako nije uspjelo osvježavanje, NE čistimo odmah stanje korisnika
      // Ovo je ključna promjena koja će spriječiti automatsko odjavljivanje
      return null;
    } catch (error) {
      console.error("Greška pri obnavljanju tokena:", error);
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
            console.log('Provjera valjanosti tokena pri inicijalizaciji...');
            const newToken = await refreshToken();
            
            if (!newToken) {
              console.log('Token nije mogao biti osvježen, ali nećemo odmah odjaviti korisnika');
              // VAŽNA PROMJENA: Ne čistimo odmah stanje korisnika, postavljamo timer
              // koji će pokušati ponovno osvježiti token kasnije
              setTimeout(() => {
                console.log('Pokušavam ponovno osvježiti token nakon odgode...');
                void refreshToken();
              }, 5000);  // Pokušaj ponovno nakon 5 sekundi
            } else {
              console.log('Token je uspješno osvježen pri inicijalizaciji');
            }
          } catch (refreshError) {
            // Greška pri osvježavanju tokena
            console.error('Greška pri provjeri tokena:', refreshError);
            // VAŽNA PROMJENA: Ne čistimo odmah stanje, postavljamo flag da je token možda nevažeći
            console.log('Token je možda nevažeći, ali zadržavamo stanje korisnika');
          }
        }
      } catch (error) {
        console.error("Greška pri učitavanju korisničkih podataka iz localStorage:", error);
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

  // Napomena: login funkcija je definirana iznad

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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Tip za odgovor prilikom osvježavanja tokena
export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken?: string;
}

export default AuthContext;