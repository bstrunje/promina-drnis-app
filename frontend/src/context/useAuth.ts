// frontend/src/context/useAuth.ts
// Hook izdvojen iz AuthContext.tsx radi poštivanja react-refresh pravila
// Koristi isključivo objekt konteksta iz authContextObject.ts
import { useContext } from 'react';
import { AuthContext } from './authContextObject';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Hrvatski komentar: ovaj hook mora biti korišten unutar AuthProvider-a
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
