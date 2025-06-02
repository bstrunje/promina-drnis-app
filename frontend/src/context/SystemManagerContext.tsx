// context/SystemManagerContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { systemManagerLogin, systemManagerLogout, systemManagerRefreshToken } from '../features/systemManager/utils/systemManagerApi';
import { SystemManagerLoginData, SystemManager } from '@shared/systemManager';

// Definicija tipa za kontekst
type SystemManagerContextType = {
  isAuthenticated: boolean;
  manager: SystemManager | null;
  login: (credentials: SystemManagerLoginData) => Promise<void>;
  logout: () => void;
  loading: boolean;
  refreshManager: () => Promise<void>;
  refreshToken: () => Promise<void>;
};

// Default vrijednosti za kontekst
const defaultContext: SystemManagerContextType = {
  isAuthenticated: false,
  manager: null,
  login: async () => { /* Implementacija će biti dostavljena kroz Provider */ },
  logout: () => { /* Implementacija će biti dostavljena kroz Provider */ },
  loading: true,
  refreshManager: async () => { /* Implementacija će biti dostavljena kroz Provider */ },
  refreshToken: async () => { /* Implementacija će biti dostavljena kroz Provider */ }
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

  // Provjera postojeće sesije prilikom učitavanja
  useEffect(() => {
    const checkAuth = () => {
      console.log('Provjeravam System Manager autentikaciju...');
      
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
        console.log('Uklonjeni regularni tokeni za korisnika koji uzrokuju konflikt');
      }

      if (systemManagerToken && storedManager) {
        try {
          // Eksplicitno definiramo tip parsiranog objekta
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const parsedData = JSON.parse(storedManager);
          // Dodajemo email polje ako ga nema u parsiranim podacima
          const parsedManager: SystemManager = {
            ...parsedData,
            email: parsedData.email || '' // Dodajemo email polje ako ga nema u parsiranim podacima
          };
          setManager(parsedManager);
          setIsAuthenticated(true);
          console.log('System Manager autentikacija uspješna');
        } catch (e) {
          console.error('Greška pri parsiranju podataka system managera:', e);
          localStorage.removeItem('systemManagerToken');
          localStorage.removeItem('systemManager');
        }
      } else {
        console.log('System Manager nije prijavljen');
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Funkcija za osvježavanje podataka managera
  const refreshManager = React.useCallback(async () => {
    console.log('Osvježavam podatke System Managera...');
    
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
      console.log('Uklonjeni regularni tokeni zbog konflikta tijekom osvježavanja');
    }
    
    // Provjera postoji li System Manager token
    if (!systemManagerToken) {
      console.warn('System Manager token nedostaje - odjavljujem System Managera');
      setManager(null);
      setIsAuthenticated(false);
      return;
    }
    
    if (storedManager) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const parsedData = JSON.parse(storedManager);
        // Dodajemo email polje ako ga nema u parsiranim podacima
        const parsedManager: SystemManager = {
          ...parsedData,
          email: parsedData.email || '' // Dodajemo email polje ako ga nema u parsiranim podacima
        };
        setManager(parsedManager);
        setIsAuthenticated(true);
        console.log('Podaci System Managera uspješno osvježeni');
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
  }, [setManager, setIsAuthenticated]);

  // Funkcija za prijavu
  const login = React.useCallback(async (credentials: SystemManagerLoginData) => {
    setLoading(true);
    try {
      const response = await systemManagerLogin(credentials);
      // Eksplicitno definiramo tip podataka iz odgovora i dodajemo email polje koje je obavezno u SystemManager tipu
      const managerData: SystemManager = {
        ...response.manager,
        email: response.manager.email || '' // Dodajemo email polje ako ga nema u odgovoru
      };
      setManager(managerData);
      setIsAuthenticated(true);
      navigate('/system-manager/dashboard');
    } catch (error) {
      console.error('Greška prilikom prijave:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [navigate, setManager, setIsAuthenticated, setLoading]);

  // Funkcija za odjavu
  const logout = React.useCallback(() => {
    try {
      console.log('Započinjem odjavu system managera...');
      
      // Pozivamo API funkciju za odjavu
      void systemManagerLogout();
      
      // Čistimo lokalno stanje
      setManager(null);
      setIsAuthenticated(false);
      
      console.log('System manager uspješno odjavljen');
      
      // Koristimo replace: true kako bismo spriječili povratak na dashboard nakon odjave
      navigate('/system-manager/login', { replace: true });
    } catch (error) {
      console.error('Greška prilikom odjave system managera:', error);
      
      // Čak i u slučaju greške, čistimo stanje i preusmjeravamo korisnika
      setManager(null);
      setIsAuthenticated(false);
      navigate('/system-manager/login', { replace: true });
    }
  }, [navigate, setManager, setIsAuthenticated]);

  // Funkcija za dohvat aktualnog managera iz backenda (npr. nakon promjene username-a)
  // refreshManager funkcija je već definirana iznad

  // Funkcija za osvježavanje tokena
  const refreshToken = React.useCallback(async () => {
    try {
      console.log('Pokušavam osvježiti System Manager token iz konteksta...');
      const response = await systemManagerRefreshToken();
      
      // Ažuriranje podataka o manageru u kontekstu
      const managerData: SystemManager = {
        ...response.manager,
        email: response.manager.email || '' // Dodajemo email polje ako ga nema u odgovoru
      };
      setManager(managerData);
      setIsAuthenticated(true);
      
      console.log('System Manager token uspješno osvježen iz konteksta');
    } catch (error) {
      console.error('Greška prilikom osvježavanja tokena iz konteksta:', error);
      
      // U slučaju greške, čistimo stanje i preusmjeravamo na login
      setManager(null);
      setIsAuthenticated(false);
      navigate('/system-manager/login', { replace: true });
      
      throw error;
    }
  }, [navigate, setManager, setIsAuthenticated]);

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
