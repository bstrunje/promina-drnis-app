// context/SystemManagerContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { systemManagerLogin, systemManagerLogout, systemManagerRefreshToken } from '../features/systemManager/utils/systemManagerApi';
import { SystemManagerLoginData, SystemManager } from '@shared/systemManager';
import { updateManifestLink } from '../utils/pwaUtils';

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

  const location = useLocation();
  const isDev = import.meta.env.DEV;
  
  /**
   * Helper za detekciju org slug-a iz URL-a
   * - /system-manager/... → null (Global SM)
   * - /promina/system-manager/... → 'promina' (Org SM)
   */
  const getOrgSlug = React.useCallback((): string | null => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    
    // Ako path počinje s 'system-manager', to je Global SM
    if (pathParts[0] === 'system-manager') {
      return null;
    }
    
    // Ako drugi dio je 'system-manager', prvi je org slug
    if (pathParts[1] === 'system-manager') {
      return pathParts[0];
    }
    
    return null;
  }, [location.pathname]);
  
  // Funkcija za osvježavanje tokena - definirana prije useEffect-a koji je koristi
  const refreshToken = React.useCallback(async () => {
    try {
      // debug
      if (isDev) console.log('Pokušavam osvježiti System Manager token iz konteksta...');
      const response = await systemManagerRefreshToken();
      
      // Ažuriranje podataka o manageru u kontekstu
      const managerData: SystemManager = {
        ...response.manager,
        email: response.manager.email || '' // Dodajemo email polje ako ga nema u odgovoru
      };
      setManager(managerData);
      setIsAuthenticated(true);
      
      if (isDev) console.log('System Manager token uspješno osvježen iz konteksta');
    } catch (error) {
      if (isDev) console.error('Greška prilikom osvježavanja tokena iz konteksta:', error);
      
      // U slučaju greške, čistimo stanje i preusmjeravamo na login
      setManager(null);
      setIsAuthenticated(false);
      
      // Dinamički login path baziran na org slug-u
      const orgSlug = getOrgSlug();
      const loginPath = orgSlug ? `/${orgSlug}/system-manager/login` : '/system-manager/login';
      
      // Dohvati branding parametar ako postoji
      const branding = localStorage.getItem('systemManagerBranding');
      const brandingQuery = branding ? `?branding=${branding}` : '';
      
      navigate(`${loginPath}${brandingQuery}`, { replace: true });
      
      throw error;
    }
  }, [navigate, setManager, setIsAuthenticated, getOrgSlug, isDev]);

  // Provjera postojeće sesije prilikom učitavanja
  useEffect(() => {
    const checkAuth = () => {
      // Ukloni PWA manifest link za System Manager stranice
      updateManifestLink();
      
      // Detekcija i spremanje branding parametra iz URL-a
      const urlParams = new URLSearchParams(window.location.search);
      const brandingParam = urlParams.get('branding') ?? urlParams.get('tenant');
      if (brandingParam) {
        localStorage.setItem('systemManagerBranding', brandingParam);
        if (isDev) console.log('[SM-CONTEXT] Spremljen branding parametar:', brandingParam);
      }
      
      if (isDev) console.log('Provjeravam System Manager autentikaciju...');
      
      const systemManagerToken = localStorage.getItem('systemManagerToken');
      const storedManager = localStorage.getItem('systemManager');
      
      // NE BRIŠEMO Member tokene - oni mogu koegzistirati za druge tabove
      
      if (systemManagerToken && storedManager) {
        try {
          const parsedUnknown = JSON.parse(storedManager) as unknown;
          const parsedManager: SystemManager = parsedUnknown as SystemManager;
          setManager(parsedManager);
          setIsAuthenticated(true);
          if (isDev) console.log('System Manager autentikacija uspješna');
        } catch (e) {
          if (isDev) console.error('Greška pri parsiranju podataka system managera:', e);
          localStorage.removeItem('systemManagerToken');
          localStorage.removeItem('systemManager');
          // KRITIČNO: Resetiraj state na null!
          setManager(null);
          setIsAuthenticated(false);
        }
      } else {
        // KRITIČNO: Ako nema tokena, resetiraj state na null!
        // Ovo sprječava fallback na GSM (organization_id: null)
        if (isDev) console.log('[SM-CONTEXT] Nema tokena - resetiranje state-a');
        setManager(null);
        setIsAuthenticated(false);
      }
      setLoading(false);
    };

    checkAuth();
  }, [isDev]);

  // Automatsko osvježavanje tokena prije isteka
  useEffect(() => {
    const setupAutoRefresh = () => {
      const token = localStorage.getItem('systemManagerToken');
      
      if (!token) {
        if (isDev) console.log('[SM-AUTO-REFRESH] Nema tokena - preskačem auto-refresh');
        return;
      }

      try {
        // Debug: Provjeri token prije dekodiranja
        if (isDev) console.log('[SM-AUTO-REFRESH] Token za dekodiranje:', token ? `${token.substring(0, 20)}...` : 'null');
        
        // Dekodiraj token da dohvatiš expiry vrijeme
        const decoded = jwtDecode<JwtPayload>(token);
        const now = Date.now() / 1000; // Trenutno vrijeme u sekundama
        const expiresIn = decoded.exp - now; // Koliko sekundi do isteka
        
        if (isDev) console.log(`[SM-AUTO-REFRESH] Token istječe za ${Math.round(expiresIn / 60)} minuta`);
        
        // Ako token već istječe za manje od 5 minuta, odmah ga osvježi
        if (expiresIn < 300) {
          if (isDev) console.log('[SM-AUTO-REFRESH] Token ističe uskoro - osvrežavam odmah');
          void refreshToken();
          return;
        }
        
        // Postavimo timeout da osvježi token 3 minute prije isteka
        const refreshTime = (expiresIn - 180) * 1000; // 3 minute prije isteka, u milisekundama
        
        if (isDev) console.log(`[SM-AUTO-REFRESH] Postavljen auto-refresh za ${Math.round(refreshTime / 60000)} minuta`);
        
        const timeoutId = setTimeout(() => {
          if (isDev) console.log('[SM-AUTO-REFRESH] Pokrećem automatsko osvježavanje tokena');
          void refreshToken().catch(err => {
            if (isDev) console.error('[SM-AUTO-REFRESH] Greška pri automatskom osvježavanju:', err);
          });
        }, refreshTime);
        
        // Cleanup funkcija
        return () => {
          if (isDev) console.log('[SM-AUTO-REFRESH] Čišćenje timeout-a');
          clearTimeout(timeoutId);
        };
      } catch (error) {
        if (isDev) console.error('[SM-AUTO-REFRESH] Greška pri dekodiranju tokena:', error);
      }
    };

    // Pokreni setup nakon što je autentikacija provjerena i korisnik je prijavljen
    if (isAuthenticated && !loading) {
      const cleanup = setupAutoRefresh();
      return cleanup;
    }
  }, [isAuthenticated, loading, refreshToken, isDev]);

  // Funkcija za osvježavanje podataka managera
  const refreshManager = React.useCallback((): Promise<void> => {
    if (isDev) console.log('Osvježavam podatke System Managera...');
    
    const systemManagerToken = localStorage.getItem('systemManagerToken');
    const storedManager = localStorage.getItem('systemManager');
    
    // NE BRIŠEMO Member tokene - oni mogu koegzistirati za druge tabove
    
    // Provjera postoji li System Manager token
    if (!systemManagerToken) {
      if (isDev) console.warn('System Manager token nedostaje - odjavljujem System Managera');
      setManager(null);
      setIsAuthenticated(false);
      return Promise.resolve();
    }
    
    if (storedManager) {
      try {
        const parsedUnknown = JSON.parse(storedManager) as unknown;
        const parsedManager: SystemManager = parsedUnknown as SystemManager;
        setManager(parsedManager);
        setIsAuthenticated(true);
        if (isDev) console.log('Podaci System Managera uspješno osvježeni');
      } catch (e) {
        if (isDev) console.error('Greška pri parsiranju podataka System Managera:', e);
        localStorage.removeItem('systemManagerToken');
        localStorage.removeItem('systemManager');
        setManager(null);
        setIsAuthenticated(false);
      }
    } else {
      if (isDev) console.warn('Podaci System Managera nedostaju, ali token postoji - nekonzistentno stanje');
      // Čišćenje nekonzistentnog stanja
      localStorage.removeItem('systemManagerToken');
      setManager(null);
      setIsAuthenticated(false);
    }
    return Promise.resolve();
  }, [setManager, setIsAuthenticated, isDev]);

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

        // Preusmjeravanje će biti upravljano od strane komponenti koje koriste ovaj context
        // Context se fokusira samo na upravljanje autentifikacijom
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
  }, [setManager, setIsAuthenticated, setLoading]);

  // Funkcija za odjavu
  const logout = React.useCallback(() => {
    try {
      if (isDev) console.log('Započinjem odjavu system managera...');
      
      // Pozivamo API funkciju za odjavu
      void systemManagerLogout();
      
      // Čistimo lokalno stanje
      setManager(null);
      setIsAuthenticated(false);
      
      if (isDev) console.log('System manager uspješno odjavljen');
      
      // Preusmjeravanje će biti upravljano od strane komponenti koje pozivaju logout
    } catch (error) {
      if (isDev) console.error('Greška prilikom odjave system managera:', error);
      
      // Čak i u slučaju greške, čistimo stanje i preusmjeravamo korisnika
      setManager(null);
      setIsAuthenticated(false);
      
      // Preusmjeravanje će biti upravljano od strane komponenti koje pozivaju logout
    }
  }, [setManager, setIsAuthenticated, isDev]);

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

 

