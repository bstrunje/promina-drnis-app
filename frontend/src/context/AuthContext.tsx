// frontend/src/context/AuthContext.tsx
import React, { createContext, useState, useContext, ReactNode, useEffect } from "react";
import axios from "axios";
import { Member } from "@shared/member";

interface AuthContextType {
  user: Member | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: Member, token: string, refreshToken?: string) => void;
  logout: () => void;
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

  // Inicijalizacija stanja iz localStorage i provjera valjanosti tokena
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        const savedUser = localStorage.getItem("user");
        const savedToken = localStorage.getItem("token");
        
        if (savedUser && savedToken) {
          // Postavljamo privremeno stanje korisnika i tokena
          const parsedUser = JSON.parse(savedUser);
          setUser({
            ...parsedUser,
            registration_completed: !!parsedUser.registration_completed,
          });
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
          }
        }
      } catch (error) {
        console.error("Greška pri učitavanju korisničkih podataka iz localStorage:", error);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        clearStoredRefreshToken();
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);

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
      (error) => Promise.reject(error)
    );

    // Interceptor za obradu odgovora i automatsko obnavljanje tokena
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Ako je greška 401 (Unauthorized) i nije već pokušano obnavljanje
        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          token // Samo ako postoji token
        ) {
          originalRequest._retry = true;

          try {
            // Pokušaj osvježiti token
            const newToken = await refreshToken();
            
            if (newToken) {
              // Ponovi originalni zahtjev s novim tokenom
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return axios(originalRequest);
            }
          } catch (refreshError) {
            // Ako obnavljanje ne uspije, odjavi korisnika
            console.error("Greška pri obnavljanju tokena, odjava korisnika:", refreshError);
            logout();
          }
        }

        return Promise.reject(error);
      }
    );

    // Čišćenje interceptora pri unmount-u
    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [token]); // Ponovno postavi interceptore kada se token promijeni

  // Funkcija za prijavu korisnika
  const login = (user: Member, accessToken: string, refreshToken?: string) => {
    const userWithStatus = {
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

  // Funkcija za dobivanje API URL-a ovisno o okruženju
  const getApiUrl = (endpoint: string): string => {
    // U produkciji koristimo relativne putanje jer su frontend i backend na istoj domeni
    // U razvoju koristimo direktne putanje jer su frontend i backend na različitim portovima
    const isDevelopment = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';
    
    if (isDevelopment) {
      return `${window.location.protocol}//${window.location.hostname}:3000${endpoint}`;
    } else {
      return endpoint; // U produkciji koristimo relativne putanje
    }
  };

  // Funkcija za odjavu korisnika
  const logout = async () => {
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
      // Ovo će pomoći u slučajevima kada backend ne uspije očistiti kolačiće
      document.cookie = "refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      
      // Ako smo u produkciji, dodajemo secure i SameSite atribute
      if (process.env.NODE_ENV === 'production' || window.location.protocol === 'https:') {
        document.cookie = "refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; SameSite=None;";
      }
      
      console.log("Kolačići očišćeni na klijentskoj strani");
    } catch (error) {
      console.error("Greška pri odjavi na backendu:", error);
      // Nastavljamo s lokalnom odjavom čak i ako backend odjava ne uspije
    } finally {
      // Lokalno brisanje podataka o korisniku
      setUser(null);
      setToken(null);
      
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("userRole");
      
      // Briši refresh token iz lokalnog spremišta
      clearStoredRefreshToken();
      
      console.log("Korisnik odjavljen lokalno, uklonjeni svi podaci uključujući refresh token");
    }
    
    // Ne vraćamo ništa kako bi se pozivatelj mogao brinuti o navigaciji
    // nakon odjave, izbjegavajući konflikte s različitim implementacijama
  };

  // Funkcija za dohvat refresh tokena iz lokalnog spremišta
  const getStoredRefreshToken = (): string | null => {
    try {
      return localStorage.getItem("refreshToken");
    } catch (error) {
      console.error("Greška pri dohvatu refresh tokena iz lokalnog spremišta:", error);
      return null;
    }
  };

  // Funkcija za spremanje refresh tokena u lokalno spremište
  const storeRefreshToken = (token: string): void => {
    try {
      localStorage.setItem("refreshToken", token);
    } catch (error) {
      console.error("Greška pri spremanju refresh tokena u lokalno spremište:", error);
    }
  };

  // Funkcija za brisanje refresh tokena iz lokalnog spremišta
  const clearStoredRefreshToken = (): void => {
    try {
      localStorage.removeItem("refreshToken");
    } catch (error) {
      console.error("Greška pri brisanju refresh tokena iz lokalnog spremišta:", error);
    }
  };

  // Funkcija za obnavljanje tokena
  const refreshToken = async (): Promise<string | null> => {
    try {
      console.log('Pokušavam osvježiti token...');
      
      // Dohvati refresh token iz lokalnog spremišta (za razvoj) ili kolačića (za produkciju)
      const storedRefreshToken = getStoredRefreshToken();
      
      // Pripremi tijelo zahtjeva - u razvoju šaljemo refresh token u tijelu
      const requestBody = {
        // U razvoju šaljemo refresh token u tijelu zahtjeva
        refreshToken: storedRefreshToken
      };
      
      console.log('Slanje zahtjeva za osvježavanje tokena:', {
        url: getApiUrl('/api/auth/refresh'),
        hasStoredRefreshToken: !!storedRefreshToken
      });
      
      // Poziv API-ja za obnavljanje tokena
      const response = await fetch(getApiUrl('/api/auth/refresh'), {
        method: 'POST',
        credentials: 'include', // I dalje šaljemo kolačiće za produkcijsko okruženje
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const newToken = data.accessToken;
      
      // Ako je vraćen novi refresh token, spremamo ga
      if (data.refreshToken) {
        console.log('Primljen novi refresh token, spremam ga u lokalno spremište');
        storeRefreshToken(data.refreshToken);
      }
      
      if (newToken) {
        setToken(newToken);
        localStorage.setItem("token", newToken);
        console.log("Token uspješno obnovljen");
        return newToken;
      }
      
      return null;
    } catch (error) {
      console.error("Greška pri obnavljanju tokena:", error);
      return null;
    }
  };

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