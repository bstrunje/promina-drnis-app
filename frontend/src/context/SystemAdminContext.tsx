// context/SystemAdminContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { systemAdminLogin, systemAdminLogout } from '../features/systemAdmin/systemAdminApi';
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
      const token = localStorage.getItem('systemAdminToken');
      const storedAdmin = localStorage.getItem('systemAdmin');

      if (token && storedAdmin) {
        try {
          // Eksplicitno definiramo tip parsiranog objekta
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const parsedAdmin: { id: number; username: string; display_name: string } = JSON.parse(storedAdmin);
          setAdmin(parsedAdmin);
          setIsAuthenticated(true);
        } catch (e) {
          console.error('Greška pri parsiranju podataka system admina:', e);
          localStorage.removeItem('systemAdminToken');
          localStorage.removeItem('systemAdmin');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

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
  const refreshAdmin = React.useCallback(async () => {
    const token = localStorage.getItem('systemAdminToken');
    if (!token) return;
    try {
      const response = await fetch(`${process.env.NODE_ENV === 'production' ? 'https://promina-drnis-api.onrender.com/api' : 'http://localhost:3000/api'}/system-admin/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        // Eksplicitno definiramo tip podataka iz odgovora
        interface AdminResponse {
          admin: { id: number; username: string; display_name: string };
        }
        const data = await response.json() as AdminResponse;
        setAdmin(data.admin);
        localStorage.setItem('systemAdmin', JSON.stringify(data.admin));
      }
    } catch {
      // fail silently - bez varijable za grešku
    }
  }, [setAdmin]);

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
