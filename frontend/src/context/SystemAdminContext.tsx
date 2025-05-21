// context/SystemAdminContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { systemAdminLogin, systemAdminLogout } from '../features/systemAdmin/utils/systemAdminApi';
import { SystemAdminLoginData } from '@shared/systemAdmin';

interface SystemAdminContextType {
  isAuthenticated: boolean;
  admin: {
    id: number;
    username: string;
    display_name: string;
  } | null;
  login: (credentials: SystemAdminLoginData) => Promise<void>;
  logout: () => void;
  loading: boolean;
  refreshAdmin: () => Promise<void>;
}

// Default vrijednosti za kontekst
const defaultContext: SystemAdminContextType = {
  isAuthenticated: false,
  admin: null,
  login: async () => { /* Implementacija će biti dostavljena kroz Provider */ },
  logout: () => { /* Implementacija će biti dostavljena kroz Provider */ },
  loading: true,
  refreshAdmin: async () => { /* Implementacija će biti dostavljena kroz Provider */ }
};

// Kreiranje konteksta
const SystemAdminContext = createContext<SystemAdminContextType>(defaultContext);

// Hook za korištenje konteksta u komponentama
// eslint-disable-next-line react-refresh/only-export-components
export const useSystemAdmin = () => useContext(SystemAdminContext);

// Provider komponenta
export const SystemAdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [admin, setAdmin] = useState<{ id: number; username: string; display_name: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  // Provjera postojeće sesije prilikom učitavanja
  useEffect(() => {
    const checkAuth = () => {
      console.log('Provjeravam System Admin autentikaciju...');
      
      const systemAdminToken = localStorage.getItem('systemAdminToken');
      const storedAdmin = localStorage.getItem('systemAdmin');
      const regularToken = localStorage.getItem('token');
      
      // Provjera konflikta tokena - ako postoje obje vrste tokena, ukloni regularne tokene
      if (systemAdminToken && regularToken) {
        console.warn('Otkriven konflikt tokena: postoje i System Admin i korisnički token!');
        // Uklanjaanje regularnih tokena korisnika
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userRole');
        localStorage.removeItem('refreshToken');
        console.log('Uklonjeni regularni tokeni za korisnika koji uzrokuju konflikt');
      }

      if (systemAdminToken && storedAdmin) {
        try {
          // Eksplicitno definiramo tip parsiranog objekta
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const parsedAdmin: { id: number; username: string; display_name: string } = JSON.parse(storedAdmin);
          setAdmin(parsedAdmin);
          setIsAuthenticated(true);
          console.log('System Admin autentikacija uspješna');
        } catch (e) {
          console.error('Greška pri parsiranju podataka system admina:', e);
          localStorage.removeItem('systemAdminToken');
          localStorage.removeItem('systemAdmin');
        }
      } else {
        console.log('System Admin nije prijavljen');
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Funkcija za osvježavanje podataka admina
  const refreshAdmin = React.useCallback(async () => {
    console.log('Osvježavam podatke System Admina...');
    
    const systemAdminToken = localStorage.getItem('systemAdminToken');
    const storedAdmin = localStorage.getItem('systemAdmin');
    const regularToken = localStorage.getItem('token');
    
    // Provjera konflikta tokena
    if (systemAdminToken && regularToken) {
      console.warn('Otkriven konflikt tokena tijekom osvježavanja!');
      // Uklanjanje regularnih tokena korisnika u korist System Admina
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
      localStorage.removeItem('refreshToken');
      console.log('Uklonjeni regularni tokeni zbog konflikta tijekom osvježavanja');
    }
    
    // Provjera postoji li System Admin token
    if (!systemAdminToken) {
      console.warn('System Admin token nedostaje - odjavljujem System Admina');
      setAdmin(null);
      setIsAuthenticated(false);
      return;
    }
    
    if (storedAdmin) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const parsedAdmin: { id: number; username: string; display_name: string } = JSON.parse(storedAdmin);
        setAdmin(parsedAdmin);
        setIsAuthenticated(true);
        console.log('Podaci System Admina uspješno osvježeni');
      } catch (e) {
        console.error('Greška pri parsiranju podataka System Admina:', e);
        localStorage.removeItem('systemAdminToken');
        localStorage.removeItem('systemAdmin');
        setAdmin(null);
        setIsAuthenticated(false);
      }
    } else {
      console.warn('Podaci System Admina nedostaju, ali token postoji - nekonzistentno stanje');
      // Čišćenje nekonzistentnog stanja
      localStorage.removeItem('systemAdminToken');
      setAdmin(null);
      setIsAuthenticated(false);
    }
  }, [setAdmin, setIsAuthenticated]);

  // Funkcija za prijavu
  const login = React.useCallback(async (credentials: SystemAdminLoginData) => {
    setLoading(true);
    try {
      const response = await systemAdminLogin(credentials);
      // Eksplicitno definiramo tip podataka iz odgovora
      const adminData: { id: number; username: string; display_name: string } = response.admin;
      setAdmin(adminData);
      setIsAuthenticated(true);
      navigate('/system-admin/dashboard');
    } catch (error) {
      console.error('Greška prilikom prijave:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [navigate, setAdmin, setIsAuthenticated, setLoading]);

  // Funkcija za odjavu
  const logout = React.useCallback(() => {
    try {
      console.log('Započinjem odjavu system admina...');
      
      // Pozivamo API funkciju za odjavu
      void systemAdminLogout();
      
      // Čistimo lokalno stanje
      setAdmin(null);
      setIsAuthenticated(false);
      
      console.log('System admin uspješno odjavljen');
      
      // Koristimo replace: true kako bismo spriječili povratak na dashboard nakon odjave
      navigate('/system-admin/login', { replace: true });
    } catch (error) {
      console.error('Greška prilikom odjave system admina:', error);
      
      // Čak i u slučaju greške, čistimo stanje i preusmjeravamo korisnika
      setAdmin(null);
      setIsAuthenticated(false);
      navigate('/system-admin/login', { replace: true });
    }
  }, [navigate, setAdmin, setIsAuthenticated]);

  // Funkcija za dohvat aktualnog admina iz backenda (npr. nakon promjene username-a)
  // refreshAdmin funkcija je već definirana iznad

  // Vrijednosti koje će biti dostupne kroz kontekst
  const contextValue: SystemAdminContextType = {
    isAuthenticated,
    admin,
    login,
    logout,
    loading,
    refreshAdmin
  };

  return (
    <SystemAdminContext.Provider value={contextValue}>
      {children}
    </SystemAdminContext.Provider>
  );
};

 
export default SystemAdminContext;
