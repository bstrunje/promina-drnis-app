import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Member } from '@shared/types/member';

interface AuthContextType {
  user: Member | null;
  login: (user: Member, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Member | null>(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        // Ensure registration_completed is properly set when loading from storage
        return {
          ...parsedUser,
          registration_completed: !!parsedUser.registration_completed
        };
      } catch (error) {
        console.error('Failed to parse user data from localStorage:', error);
        localStorage.removeItem('user');
        return null;
      }
    }
    return null;
  });

  const login = (user: Member, token: string) => {
    // Ensure registration_completed is properly set when logging in
    const userWithStatus = {
      ...user,
      registration_completed: true
    };
    setUser(userWithStatus);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userWithStatus));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};