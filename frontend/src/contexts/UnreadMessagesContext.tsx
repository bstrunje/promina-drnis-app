import React, { useState, useEffect, ReactNode } from 'react';
import { getUnreadMessageCount } from '../utils/api/apiMessages';
import { useAuth } from '../context/useAuth';
import { UnreadMessagesContext, type UnreadMessagesContextType } from './unreadMessages-core';

interface UnreadMessagesProviderProps {
  children: ReactNode;
}

export const UnreadMessagesProvider: React.FC<UnreadMessagesProviderProps> = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const { user, isAuthenticated } = useAuth();

  // Dohvat broja nepročitanih poruka - memoiziran radi stabilnog dependency-a
  const refreshUnreadCount = React.useCallback(async () => {
    if (!isAuthenticated || !user) return;
    try {
      const count = await getUnreadMessageCount();
      setUnreadCount(count);
    } catch {
      // Tihi fallback bez console logova radi ESLint pravila
    }
  }, [isAuthenticated, user]);

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

  const value: UnreadMessagesContextType = {
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
