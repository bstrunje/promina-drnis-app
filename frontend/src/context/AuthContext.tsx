// frontend/src/context/AuthContext.tsx
import React, { createContext, useState, useContext, ReactNode, useEffect } from "react";
import axios from "axios";
import { Member } from "@shared/member";

interface AuthContextType {
  user: Member | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: Member, token: string, refreshToken?: string) => void;
  logout: () => void | Promise<void>;
  refreshToken: () => Promise<string | null>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<Member | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Funkcija za dobivanje API URL-a ovisno o okruženju
  const getApiUrl = React.useCallback((endpoint: string): string => {
    // U produkciji koristimo relativne putanje jer su frontend i backend na istoj domeni
    // U razvoju koristimo direktne putanje jer su frontend i backend na različitim portovima
    const isDevelopment = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';
    if (isDevelopment) {
      return `${window.location.protocol}//${window.location.hostname}:3000${endpoint}`;
    } else {
      return endpoint; // U produkciji koristimo relativne putanje
    }
  }, []);

  // Funkcija za dohvat refresh tokena iz lokalnog spremišta
  const getStoredRefreshToken = (): string | null => {
    try {
      return localStorage.getItem("refreshToken");
    } catch (error) {
      console.error("Greška pri dohvatu refresh tokena iz lokalnog spremišta:", error);
      return null;
    }
  };

  // Funkcija za brisanje refresh tokena iz lokalnog spremišta
  const clearStoredRefreshToken = React.useCallback((): void => {
    try {
      localStorage.removeItem("refreshToken");
    } catch (error) {
      console.error("Greška pri brisanju refresh tokena iz lokalnog spremišta:", error);
    }
  }, []);

  // Funkcija za spremanje refresh tokena u lokalno spremište
  const storeRefreshToken = React.useCallback((token: string): void => {
    try {
      localStorage.setItem("refreshToken", token);
    } catch (error) {
      console.error("Greška pri spremanju refresh tokena u lokalno spremište:", error);
    }
  }, []);

  // Funkcija za odjavu korisnika
  const logout = React.useCallback(async () => {
    try {
      console.log("Započinjem proces odjave korisnika...");
      // Poziv backend API-ja za odjavu i poništavanje refresh tokena
      const response = await fetch(getApiUrl('/api/auth/logout'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      if (response.ok) {
        console.log("Korisnik uspješno odjavljen na backendu");
      } else {
        console.error(`Greška pri odjavi na backendu: HTTP ${response.status}`);
      }
      // Dodatno čišćenje kolačića na klijentskoj strani kao sigurnosna mjera
      document.cookie = "refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      if (process.env.NODE_ENV === 'production' || window.location.protocol === 'https:') {
        document.cookie = "refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; SameSite=None;";
      }
      console.log("Kolačići očišćeni na klijentskoj strani");
    } catch (error) {
      console.error("Greška pri odjavi na backendu:", error);
    } finally {
      // Lokalno brisanje podataka o korisniku
      setUser(null);
      setToken(null);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("userRole");
      clearStoredRefreshToken();
      console.log("Korisnik odjavljen lokalno, uklonjeni svi podaci uključujući refresh token");
    }
    // Ne vraćamo ništa kako bi se pozivatelj mogao brinuti o navigaciji
    // nakon odjave, izbjegavajući konflikte s različitim implementacijama
  }, [getApiUrl, setUser, setToken, clearStoredRefreshToken]);


  // Funkcija za obnavljanje tokena
  const refreshToken = React.useCallback(async (): Promise<string | null> => {
    try {
      console.log('Pokušavam osvježiti token...');
      const storedRefreshToken = getStoredRefreshToken();
      const requestBody = {
        refreshToken: storedRefreshToken
      };
      console.log('Slanje zahtjeva za osvježavanje tokena:', {
        refreshToken: storedRefreshToken
      });
      const response = await fetch(getApiUrl('/api/auth/refresh'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: unknown = await response.json();
      if (typeof data === 'object' && data !== null) {
        const { accessToken, refreshToken } = data as RefreshTokenResponse;
        if (typeof refreshToken === 'string') {
          console.log('Primljen novi refresh token, spremam ga u lokalno spremište');
          storeRefreshToken(refreshToken);
        }
        if (typeof accessToken === 'string') {
          setToken(accessToken);
          localStorage.setItem("token", accessToken);
          console.log("Token uspješno obnovljen");
          return accessToken;
        }
      }
      return null;
    } catch (error) {
      console.error("Greška pri obnavljanju tokena:", error);
      return null;
    }
  }, [storeRefreshToken, setToken, getApiUrl]);

  // Inicijalizacija stanja iz localStorage i provjera valjanosti tokena
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        const savedUser = localStorage.getItem("user");
        const savedToken = localStorage.getItem("token");
        
        if (savedUser && savedToken) {
          // Postavljamo privremeno stanje korisnika i tokena
          // Parsiramo JSON i radimo provjeru tipa umjesto any
          let parsedUser: unknown;
          try {
            parsedUser = JSON.parse(savedUser);
          } catch {
            parsedUser = null;
          }

          // Type guard za Member
          const isMember = (obj: unknown): obj is Member => {
            if (!obj || typeof obj !== 'object') return false;
            return 'id' in obj && 'first_name' in obj;
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
              // Token nije mogao biti osvježen, korisnik nije autentificiran
              console.log('Token nije valjan, brišem podatke o korisniku');
              setUser(null);
              setToken(null);
              localStorage.removeItem("user");
              localStorage.removeItem("token");
              clearStoredRefreshToken();
              throw new Error('Token nije mogao biti osvježen');
            } else {
              console.log('Token je uspješno osvježen pri inicijalizaciji');
            }
          } catch (refreshError) {
            // Greška pri osvježavanju tokena
            console.error('Greška pri provjeri tokena:', refreshError);
            setUser(null);
            setToken(null);
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            clearStoredRefreshToken();
            throw refreshError instanceof Error ? refreshError : new Error(String(refreshError));
          }
        }
      } catch (error) {
        console.error("Greška pri učitavanju korisničkih podataka iz localStorage:", error);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        clearStoredRefreshToken();
        throw error instanceof Error ? error : new Error(String(error));
      } finally {
        setIsLoading(false);
      }
    };
    
    void checkAuth();
  }, [refreshToken, clearStoredRefreshToken]);

  // Postavljanje axios interceptora za automatsko obnavljanje tokena
  useEffect(() => {
    // Interceptor za dodavanje tokena u zahtjeve i osiguravanje slanja kolačića
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        // Dodaj token u zaglavlje ako postoji
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Osiguraj da se kolačići šalju sa svim zahtjevima
        config.withCredentials = true;
        
        return config;
      },
      (error) => Promise.reject(error instanceof Error ? error : new Error(String(error)))
    );

    // Interceptor za obradu odgovora i automatsko obnavljanje tokena
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error: unknown) => {
        // Osiguraj siguran pristup .config, .response, ._retry
        if (!error || typeof error !== 'object') {
          return Promise.reject(new Error('Nepoznata greška u axios interceptoru'));
        }
        // Type guard za AxiosError
        function isAxiosError(err: unknown): err is import('axios').AxiosError {
          return (
            typeof err === 'object' &&
            err !== null &&
            'isAxiosError' in err &&
            typeof (err as { isAxiosError: unknown }).isAxiosError === 'boolean'
          );
        }
        if (!isAxiosError(error)) {
          return Promise.reject(new Error('Nepoznata greška u axios interceptoru'));
        }
        const axiosError = error;
        const originalRequest = (axiosError.config ?? {}) as import('axios').AxiosRequestConfig & { _retry?: boolean };

        // Ako je greška 401 (Unauthorized) i nije već pokušano obnavljanje
        if (
          axiosError.response?.status === 401 &&
          !originalRequest._retry &&
          token // Samo ako postoji token
        ) {
          originalRequest._retry = true;

          try {
            // Pokušaj osvježiti token
            const newToken = await refreshToken();
            if (newToken) {
              // Sigurno dodavanje Authorization headera
              if (originalRequest.headers && typeof originalRequest.headers === 'object') {
                (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
              } else {
                originalRequest.headers = { Authorization: `Bearer ${newToken}` };
              }
              return axios(originalRequest);
            }
          } catch (refreshError) {
            console.error("Greška pri obnavljanju tokena, odjava korisnika:", refreshError instanceof Error ? refreshError.message : String(refreshError));
            void logout();
          }
        }
        // Ispravi stringifikaciju error objekta
        return Promise.reject(error instanceof Error ? error : new Error(JSON.stringify(error)));
      }
    );

    // Čišćenje interceptora pri unmount-u
    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [token, logout, refreshToken]); // Ponovno postavi interceptore kada se token, logout ili refreshToken promijeni

  // Funkcija za prijavu korisnika
  const login = (user: Member, accessToken: string, refreshToken?: string) => {
    const userWithStatus: Member = {
      ...user,
      registration_completed: true,
    };
    
    setUser(userWithStatus);
    setToken(accessToken);
    
    localStorage.setItem("token", accessToken);
    localStorage.setItem("user", JSON.stringify(userWithStatus));
    
    // Ako je proslijeđen refresh token, spremamo ga u lokalno spremište
    if (refreshToken) {
      console.log('Spremam refresh token u lokalno spremište');
      storeRefreshToken(refreshToken);
    }
  };




  // Funkcija za obnavljanje tokena
  interface RefreshTokenResponse {
    accessToken?: string;
    refreshToken?: string;
  }


  // Vrijednosti koje se pružaju kroz context
  const contextValue: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    login,
    logout,
    refreshToken,
    isLoading
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