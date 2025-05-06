import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/config';
import { useAuth } from './AuthContext';
import { setCurrentTimeZone } from '../utils/dateUtils';

// Ključ za localStorage
const TIME_ZONE_CACHE_KEY = 'promina_app_timezone';

// Tip konteksta
interface TimeZoneContextType {
  timeZone: string;
  loading: boolean;
  error: string | null;
  setTimeZone: (timeZone: string) => void;
  refreshTimeZone: () => Promise<void>;
}

// Kreiraj kontekst
const TimeZoneContext = createContext<TimeZoneContextType>({
  timeZone: 'Europe/Zagreb', // Zadana vrijednost
  loading: false,
  error: null,
  setTimeZone: () => {}, // Bit će zamijenjena stvarnom funkcijom
  refreshTimeZone: async () => {} // Bit će zamijenjena stvarnom funkcijom
});

// Hook za korištenje konteksta
export const useTimeZone = () => useContext(TimeZoneContext);

// Provider komponenta
export const TimeZoneProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [timeZone, setTimeZone] = useState<string>(() => {
    // Pokušaj dohvatiti iz cache-a, ili koristi default
    return localStorage.getItem(TIME_ZONE_CACHE_KEY) || 'Europe/Zagreb';
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth(); // Dohvaćamo user objekt
  
  // Dohvaćamo token iz localStorage (definiran u AuthContext-u)
  const getAuthToken = (): string | null => {
    return localStorage.getItem('token');
  };

  // Dohvati vremensku zonu iz postavki
  const fetchTimeZone = async () => {
    const token = getAuthToken();
    
    // Provjeri je li korisnik autoriziran
    if (!token) {
      // Ako nema tokena, koristi zadanu ili cache vrijednost i ne šalji zahtjev
      return;
    }

    try {
      setLoading(true);
      setError(null);
      // Pokušaj dohvatiti postavke
      try {
        const response = await axios.get(`${API_BASE_URL}/system-admin/settings`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (response.data && response.data.timeZone) {
          setTimeZone(response.data.timeZone);
          localStorage.setItem(TIME_ZONE_CACHE_KEY, response.data.timeZone);
          setCurrentTimeZone(response.data.timeZone);
        }
      } catch (apiErr) {
        if (axios.isAxiosError(apiErr) && (apiErr.response?.status === 403 || apiErr.response?.status === 401)) {
          // Koristimo već učitanu vremensku zonu iz localStorage (postavljenu pri inicijalizaciji)
          setCurrentTimeZone(timeZone);
        } else {
          throw apiErr;
        }
      }
    } catch (err) {
      setError('Nije moguće dohvatiti postavke vremenske zone.');
    } finally {
      setLoading(false);
    }
  };

  // Funkcija za ručno osvježavanje postavki vremenske zone
  const refreshTimeZone = async () => {
    await fetchTimeZone();
  };

  // Efekt za sinkronizaciju vremenske zone kada se promijeni u kontekstu
  useEffect(() => {
    if (timeZone) {
      setCurrentTimeZone(timeZone);
      
      // Cache vremensku zonu za sve korisnike
      localStorage.setItem(TIME_ZONE_CACHE_KEY, timeZone);
    }
  }, [timeZone]);

  // Vrijednosti koje će biti dostupne kroz kontekst
  const contextValue: TimeZoneContextType = {
    timeZone,
    loading,
    error,
    setTimeZone,
    refreshTimeZone
  };

  return (
    <TimeZoneContext.Provider value={contextValue}>
      {children}
    </TimeZoneContext.Provider>
  );
};
