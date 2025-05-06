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
}

// Default vrijednosti za kontekst
const defaultContext: SystemAdminContextType = {
  isAuthenticated: false,
  admin: null,
  login: async () => {},
  logout: () => {},
  loading: true
};

// Kreiranje konteksta
const SystemAdminContext = createContext<SystemAdminContextType>(defaultContext);

// Hook za korištenje konteksta u komponentama
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
          const parsedAdmin = JSON.parse(storedAdmin);
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
  const login = async (credentials: SystemAdminLoginData) => {
    setLoading(true);
    try {
      const response = await systemAdminLogin(credentials);
      setAdmin(response.admin);
      setIsAuthenticated(true);
      navigate('/system-admin/dashboard');
    } catch (error) {
      console.error('Greška prilikom prijave:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Funkcija za odjavu
  const logout = () => {
    systemAdminLogout();
    setAdmin(null);
    setIsAuthenticated(false);
    navigate('/system-admin/login');
  };

  // Vrijednosti koje će biti dostupne kroz kontekst
  const contextValue: SystemAdminContextType = {
    isAuthenticated,
    admin,
    login,
    logout,
    loading
  };

  return (
    <SystemAdminContext.Provider value={contextValue}>
      {children}
    </SystemAdminContext.Provider>
  );
};

export default SystemAdminContext;
