import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getUnreadMessageCount } from '../utils/api/apiMessages';
import { useAuth } from '../context/useAuth';

interface UnreadMessagesContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  setUnreadCount: (count: number) => void;
}

const UnreadMessagesContext = createContext<UnreadMessagesContextType | undefined>(undefined);

export const useUnreadMessages = () => {
  const context = useContext(UnreadMessagesContext);
  if (context === undefined) {
    throw new Error('useUnreadMessages must be used within an UnreadMessagesProvider');
  }
  return context;
};

interface UnreadMessagesProviderProps {
  children: ReactNode;
}

export const UnreadMessagesProvider: React.FC<UnreadMessagesProviderProps> = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const { user, isAuthenticated } = useAuth();

  // Dohvat broja nepročitanih poruka
  const refreshUnreadCount = async () => {
    if (!isAuthenticated || !user) return;
    
    try {
      const count = await getUnreadMessageCount();
      setUnreadCount(count);
    } catch {
      // Tihi fallback bez console logova radi ESLint pravila
    }
  };

  // Automatski dohvat broja nepročitanih poruka pri učitavanju i kada se korisnik prijavi
  useEffect(() => {
    if (isAuthenticated && user) {
      void refreshUnreadCount();
      
      // Postavi interval za periodičko osvježavanje broja nepročitanih poruka (svakih 60 sekundi)
      const intervalId = setInterval(() => {
        void refreshUnreadCount();
      }, 60000);
      
      return () => clearInterval(intervalId);
    } else {
      setUnreadCount(0);
    }
  }, [isAuthenticated, user, refreshUnreadCount]);

  const value = {
    unreadCount,
    refreshUnreadCount,
    setUnreadCount
  };

  return (
    <UnreadMessagesContext.Provider value={value}>
      {children}
    </UnreadMessagesContext.Provider>
  );
};
