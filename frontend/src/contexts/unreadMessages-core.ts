import { createContext } from 'react';

export interface UnreadMessagesContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  setUnreadCount: (count: number) => void;
}

export const UnreadMessagesContext = createContext<UnreadMessagesContextType | undefined>(undefined);
