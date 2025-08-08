import { createContext } from 'react';

// Ključ za localStorage
export const TIME_ZONE_CACHE_KEY = 'promina_app_timezone';

// Tip konteksta
export interface TimeZoneContextType {
  timeZone: string;
  loading: boolean;
  error: string | null;
  setTimeZone: (timeZone: string) => void;
  refreshTimeZone: () => Promise<void>;
}

// Kreiraj kontekst (default vrijednosti samo kao placeholderi)
export const TimeZoneContext = createContext<TimeZoneContextType>({
  timeZone: 'Europe/Zagreb',
  loading: false,
  error: null,
  setTimeZone: () => { /* Implementacija dolazi iz Providera */ },
  refreshTimeZone: async () => { /* Implementacija dolazi iz Providera */ }
});
