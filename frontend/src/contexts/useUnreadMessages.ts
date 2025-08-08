import { useContext } from 'react';
import { UnreadMessagesContext } from './unreadMessages-core';

// Hook za korištenje UnreadMessages konteksta
export function useUnreadMessages() {
  const context = useContext(UnreadMessagesContext);
  if (context === undefined) {
    throw new Error('useUnreadMessages must be used within an UnreadMessagesProvider');
  }
  return context;
}
