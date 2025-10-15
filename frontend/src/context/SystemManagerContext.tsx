// context/SystemManagerContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { systemManagerLogin, systemManagerLogout, systemManagerRefreshToken } from '../features/systemManager/utils/systemManagerApi';
import { SystemManagerLoginData, SystemManager } from '@shared/systemManager';

// JWT payload interface
interface JwtPayload {
  exp: number; // expiry timestamp u sekundama
  iat: number; // issued at timestamp u sekundama
  id: number;
  role: string;
}

// Definicija tipa za kontekst
// Definicija tipa za odgovor login funkcije
interface LoginResponse {
  token?: string;
  manager?: SystemManager;
  twoFactorRequired?: boolean;
  resetRequired?: boolean;
  tempToken?: string;
}

// Definicija tipa za kontekst
interface SystemManagerContextType {
  isAuthenticated: boolean;
  manager: SystemManager | null;
  login: (credentials: SystemManagerLoginData) => Promise<LoginResponse>;
  logout: () => void;
  loading: boolean;
  refreshManager: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

// Default vrijednosti za kontekst
const defaultContext: SystemManagerContextType = {
  isAuthenticated: false,
  manager: null,
  login: () => Promise.resolve({}), // Implementacija će biti dostavljena kroz Provider
  logout: () => { /* Implementacija će biti dostavljena kroz Provider */ },
  loading: true,
  refreshManager: () => Promise.resolve(), // Implementacija će biti dostavljena kroz Provider
  refreshToken: () => Promise.resolve() // Implementacija će biti dostavljena kroz Provider
};

// Kreiranje konteksta
const SystemManagerContext = createContext<SystemManagerContextType>(defaultContext);

// Hook za korištenje konteksta u komponentama
// eslint-disable-next-line react-refresh/only-export-components
export const useSystemManager = () => useContext(SystemManagerContext);

// Provider komponenta
export const SystemManagerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [manager, setManager] = useState<SystemManager | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  // Funkcija za osvježavanje tokena - definirana prije useEffect-a koji je koristi
  const refreshToken = React.useCallback(async () => {
    try {
      // console.log('Pokušavam osvježiti System Manager token iz konteksta...');
      const response = await systemManagerRefreshToken();
      
      // Ažuriranje podataka o manageru u kontekstu
      const managerData: SystemManager = {
        ...response.manager,
        email: response.manager.email || '' // Dodajemo email polje ako ga nema u odgovoru
      };
      setManager(managerData);
      setIsAuthenticated(true);
      
      // console.log('System Manager token uspješno osvježen iz konteksta');
    } catch (error) {
      console.error('Greška prilikom osvježavanja tokena iz konteksta:', error);
      
      // U slučaju greške, čistimo stanje i preusmjeravamo na login
      setManager(null);
      setIsAuthenticated(false);
      
      // Dohvati branding parametar ako postoji
      const branding = localStorage.getItem('systemManagerBranding');
      const brandingQuery = branding ? `?branding=${branding}` : '';
      
      navigate(`/system-manager/login${brandingQuery}`, { replace: true });
      
      throw error;
    }
  }, [navigate, setManager, setIsAuthenticated]);

  // Provjera postojeće sesije prilikom učitavanja
  useEffect(() => {
    const checkAuth = () => {
      // Detekcija i spremanje branding parametra iz URL-a
      const urlParams = new URLSearchParams(window.location.search);
      const brandingParam = urlParams.get('branding') ?? urlParams.get('tenant');
      if (brandingParam) {
        localStorage.setItem('systemManagerBranding', brandingParam);
        console.log('[SM-CONTEXT] Spremljen branding parametar:', brandingParam);
      }
      
      // console.log('Provjeravam System Manager autentikaciju...');
      
      const systemManagerToken = localStorage.getItem('systemManagerToken');
      const storedManager = localStorage.getItem('systemManager');
      const regularToken = localStorage.getItem('token');
      
      // Provjera konflikta tokena - ako postoje obje vrste tokena, ukloni regularne tokene
      if (systemManagerToken && regularToken) {
        console.warn('Otkriven konflikt tokena: postoje i System Manager i korisnički token!');
        // Uklanjaanje regularnih tokena korisnika
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userRole');
        localStorage.removeItem('refreshToken');
        // console.log('Uklonjeni regularni tokeni za korisnika koji uzrokuju konflikt');
      }

      if (systemManagerToken && storedManager) {
        try {
          // Eksplicitno definiramo tip parsiranog objekta
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const parsedData = JSON.parse(storedManager);
          const parsedManager: SystemManager = parsedData as SystemManager;
          setManager(parsedManager);
          setIsAuthenticated(true);
          // console.log('System Manager autentikacija uspješna');
        } catch (e) {
          console.error('Greška pri parsiranju podataka system managera:', e);
          localStorage.removeItem('systemManagerToken');
          localStorage.removeItem('systemManager');
          // KRITIČNO: Resetiraj state na null!
          setManager(null);
          setIsAuthenticated(false);
        }
      } else {
        // KRITIČNO: Ako nema tokena, resetiraj state na null!
        // Ovo sprječava fallback na GSM (organization_id: null)
        console.log('[SM-CONTEXT] Nema tokena - resetiranje state-a');
        setManager(null);
        setIsAuthenticated(false);
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Automatsko osvježavanje tokena prije isteka
  useEffect(() => {
    const setupAutoRefresh = () => {
      const token = localStorage.getItem('systemManagerToken');
      
      if (!token) {
        console.log('[SM-AUTO-REFRESH] Nema tokena - preskačem auto-refresh');
        return;
      }

      try {
        // Dekodiraj token da dohvatiš expiry vrijeme
        const decoded = jwtDecode<JwtPayload>(token);
        const now = Date.now() / 1000; // Trenutno vrijeme u sekundama
        const expiresIn = decoded.exp - now; // Koliko sekundi do isteka
        
        console.log(`[SM-AUTO-REFRESH] Token istječe za ${Math.round(expiresIn / 60)} minuta`);
        
        // Ako token već istječe za manje od 5 minuta, odmah ga osvježi
        if (expiresIn < 300) {
          console.log('[SM-AUTO-REFRESH] Token ističe uskoro - osvrežavam odmah');
          void refreshToken();
          return;
        }
        
        // Postavimo timeout da osvježi token 3 minute prije isteka
        const refreshTime = (expiresIn - 180) * 1000; // 3 minute prije isteka, u milisekundama
        
        console.log(`[SM-AUTO-REFRESH] Postavljen auto-refresh za ${Math.round(refreshTime / 60000)} minuta`);
        
        const timeoutId = setTimeout(() => {
          console.log('[SM-AUTO-REFRESH] Pokrećem automatsko osvježavanje tokena');
          void refreshToken().catch(err => {
            console.error('[SM-AUTO-REFRESH] Greška pri automatskom osvježavanju:', err);
          });
        }, refreshTime);
        
        // Cleanup funkcija
        return () => {
          console.log('[SM-AUTO-REFRESH] Čišćenje timeout-a');
          clearTimeout(timeoutId);
        };
      } catch (error) {
        console.error('[SM-AUTO-REFRESH] Greška pri dekodiranju tokena:', error);
      }
    };

    // Pokreni setup nakon što je autentikacija provjerena i korisnik je prijavljen
    if (isAuthenticated && !loading) {
      const cleanup = setupAutoRefresh();
      return cleanup;
    }
  }, [isAuthenticated, loading, refreshToken]);

  // Funkcija za osvježavanje podataka managera
  const refreshManager = React.useCallback((): Promise<void> => {
    // console.log('Osvježavam podatke System Managera...');
    
    const systemManagerToken = localStorage.getItem('systemManagerToken');
    const storedManager = localStorage.getItem('systemManager');
    const regularToken = localStorage.getItem('token');
    
    // Provjera konflikta tokena
    if (systemManagerToken && regularToken) {
      console.warn('Otkriven konflikt tokena tijekom osvježavanja!');
      // Uklanjanje regularnih tokena korisnika u korist System Managera
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
      localStorage.removeItem('refreshToken');
      // console.log('Uklonjeni regularni tokeni zbog konflikta tijekom osvježavanja');
    }
    
    // Provjera postoji li System Manager token
    if (!systemManagerToken) {
      console.warn('System Manager token nedostaje - odjavljujem System Managera');
      setManager(null);
      setIsAuthenticated(false);
      return Promise.resolve();
    }
    
    if (storedManager) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const parsedData = JSON.parse(storedManager);
        const parsedManager: SystemManager = parsedData as SystemManager;
        setManager(parsedManager);
        setIsAuthenticated(true);
        // console.log('Podaci System Managera uspješno osvježeni');
      } catch (e) {
        console.error('Greška pri parsiranju podataka System Managera:', e);
        localStorage.removeItem('systemManagerToken');
        localStorage.removeItem('systemManager');
        setManager(null);
        setIsAuthenticated(false);
      }
    } else {
      console.warn('Podaci System Managera nedostaju, ali token postoji - nekonzistentno stanje');
      // Čišćenje nekonzistentnog stanja
      localStorage.removeItem('systemManagerToken');
      setManager(null);
      setIsAuthenticated(false);
    }
    return Promise.resolve();
  }, [setManager, setIsAuthenticated]);

  // Funkcija za prijavu
  const login = React.useCallback(async (credentials: SystemManagerLoginData): Promise<LoginResponse> => {
    setLoading(true);
    try {
      const response = await systemManagerLogin(credentials);

      // Ako je login uspješan i ne zahtijeva dodatne korake
      if (response.token && response.manager) {
        const managerData: SystemManager = response.manager;
        localStorage.setItem('systemManagerToken', response.token);
        localStorage.setItem('systemManager', JSON.stringify(managerData));

        setManager(managerData);
        setIsAuthenticated(true);

        // Dohvati branding parametar ako postoji
        const branding = localStorage.getItem('systemManagerBranding');
        const brandingQuery = branding ? `?branding=${branding}` : '';
        
        if (managerData.organization_id === null) {
          navigate('/system-manager/organizations');
        } else {
          navigate(`/system-manager/dashboard${brandingQuery}`);
        }
      }

      // Vrati cijeli odgovor da ga pozivatelj može obraditi
      return response;
    } catch (error) {
      console.error('Greška prilikom prijave:', error);
      localStorage.removeItem('systemManagerToken');
      localStorage.removeItem('systemManager');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [navigate, setManager, setIsAuthenticated, setLoading]);

  // Funkcija za odjavu
  const logout = React.useCallback(() => {
    try {
      // console.log('Započinjem odjavu system managera...');
      
      // Pozivamo API funkciju za odjavu
      void systemManagerLogout();
      
      // Čistimo lokalno stanje
      setManager(null);
      setIsAuthenticated(false);
      
      // console.log('System manager uspješno odjavljen');
      
      // Dohvati branding parametar ako postoji
      const branding = localStorage.getItem('systemManagerBranding');
      const brandingQuery = branding ? `?branding=${branding}` : '';
      
      // Koristimo replace: true kako bismo spriječili povratak na dashboard nakon odjave
      navigate(`/system-manager/login${brandingQuery}`, { replace: true });
    } catch (error) {
      console.error('Greška prilikom odjave system managera:', error);
      
      // Čak i u slučaju greške, čistimo stanje i preusmjeravamo korisnika
      setManager(null);
      setIsAuthenticated(false);
      
      // Dohvati branding parametar ako postoji
      const branding = localStorage.getItem('systemManagerBranding');
      const brandingQuery = branding ? `?branding=${branding}` : '';
      
      navigate(`/system-manager/login${brandingQuery}`, { replace: true });
    }
  }, [navigate, setManager, setIsAuthenticated]);

  // Funkcija za dohvat aktualnog managera iz backenda (npr. nakon promjene username-a)
  // refreshManager i refreshToken funkcije su već definirane iznad

  // Vrijednosti koje će biti dostupne kroz kontekst
  const contextValue: SystemManagerContextType = {
    isAuthenticated,
    manager,
    login,
    logout,
    loading,
    refreshManager,
    refreshToken
  };

  return (
    <SystemManagerContext.Provider value={contextValue}>
      {children}
    </SystemManagerContext.Provider>
  );
};

 
export default SystemManagerContext;
