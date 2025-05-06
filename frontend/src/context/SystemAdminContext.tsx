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
  login: async () => {},
  logout: () => {},
  loading: true,
  refreshAdmin: async () => {}
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

  // Funkcija za dohvat aktualnog admina iz backenda (npr. nakon promjene username-a)
  const refreshAdmin = async () => {
    const token = localStorage.getItem('systemAdminToken');
    if (!token) return;
    try {
      const response = await fetch(`${process.env.NODE_ENV === 'production' ? 'https://promina-drnis-api.onrender.com/api' : 'http://localhost:3000/api'}/system-admin/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAdmin(data.admin);
        localStorage.setItem('systemAdmin', JSON.stringify(data.admin));
      }
    } catch (err) {
      // fail silently
    }
  };

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
