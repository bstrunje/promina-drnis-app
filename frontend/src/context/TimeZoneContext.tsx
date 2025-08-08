import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/config';
import { useAuth } from './useAuth';
import { setCurrentTimeZone } from '../utils/dateUtils';
import { TIME_ZONE_CACHE_KEY, TimeZoneContext, type TimeZoneContextType } from './timeZone-core';

export const TimeZoneProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [timeZone, setTimeZone] = useState<string>(() => {
    // Pokušaj dohvatiti iz cache-a, ili koristi default
    return localStorage.getItem(TIME_ZONE_CACHE_KEY) ?? 'Europe/Zagreb';
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // Dohvaćamo auth kontekst (trenutno ne koristimo ništa iz njega)
  useAuth();
  
  // Dohvati vremensku zonu iz postavki
  const fetchTimeZone = React.useCallback(async () => {
    // Dohvaćamo token iz localStorage (definiran u AuthContext-u)
    const token = localStorage.getItem('token');
    
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
        // Definiramo tip odgovora
        interface SettingsResponse {
          timeZone: string;
        }
        
        const responseData = response.data as SettingsResponse;
        if (responseData?.timeZone) {
          setTimeZone(responseData.timeZone);
          localStorage.setItem(TIME_ZONE_CACHE_KEY, responseData.timeZone);
          setCurrentTimeZone(responseData.timeZone);
        }
      } catch (apiErr) {
        if (axios.isAxiosError(apiErr) && (apiErr.response?.status === 403 || apiErr.response?.status === 401)) {
          // Koristimo već učitanu vremensku zonu iz localStorage (postavljenu pri inicijalizaciji)
          setCurrentTimeZone(timeZone);
        } else {
          throw apiErr;
        }
      }
    } catch {
      setError('Nije moguće dohvatiti postavke vremenske zone.');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, timeZone, setTimeZone]);

  // Funkcija za ručno osvježavanje postavki vremenske zone
  const refreshTimeZone = React.useCallback(async () => {
    await fetchTimeZone();
  }, [fetchTimeZone]);

  // Efekt za sinkronizaciju vremenske zone kada se promijeni u kontekstu
  useEffect(() => {
    if (timeZone) {
      setCurrentTimeZone(timeZone);
      
      // Cache vremensku zonu za sve korisnike
      localStorage.setItem(TIME_ZONE_CACHE_KEY, timeZone);
    }
  }, [timeZone]); // setCurrentTimeZone je stabilna funkcija, ne treba biti u dependency arrayu

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
