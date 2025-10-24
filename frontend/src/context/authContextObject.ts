// frontend/src/context/authContextObject.ts
import { createContext } from 'react';
import { Member } from '@shared/member';

// Definiramo tip konteksta na jednom mjestu
export interface AuthContextType {
  user: Member | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: Member, token: string, refreshToken?: string) => void;
  logout: () => void | Promise<void>;
  refreshToken: () => Promise<string | null>;
  updateUser: (user: Member) => void; // Ažurira user objekt
  isLoading: boolean;
  softLogout: () => void; // 'soft logout'
  lastPath: string | null; // posljednja putanja
}

// Izvozimo samo objekt konteksta; Provider ostaje u AuthContext.tsx
export const AuthContext = createContext<AuthContextType | undefined>(undefined);
