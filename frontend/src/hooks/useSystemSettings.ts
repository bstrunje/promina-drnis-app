import { useState, useEffect, useCallback } from 'react';
import { SystemSettings } from '@shared/settings';
import { getSystemSettings } from '../utils/api/apiSettings';

/**
 * Hook za dohvaćanje system settings
 */
export const useSystemSettings = () => {
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchSettings = useCallback(async () => {
    try {
      // Provjeri postoji li auth token (member ili system manager)
      const memberToken = localStorage.getItem('token');
      const systemManagerToken = localStorage.getItem('systemManagerToken');
      const token = memberToken ?? systemManagerToken;
      
      if (!token) {
        // Nema token - postavi default stanje i završi
        setSystemSettings(null);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const settings = await getSystemSettings();
      setSystemSettings(settings);
      setError(null);
    } catch (err) {
      console.error('Error fetching system settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch system settings');
      setSystemSettings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings, refreshTrigger]);

  // Slušaj custom event za ažuriranje settings-a
  useEffect(() => {
    const handleSettingsUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<SystemSettings>;
      if (customEvent.detail) {
        setSystemSettings(customEvent.detail);
      } else {
        // Ako nema detail-a, refetch-aj
        void fetchSettings();
      }
    };

    window.addEventListener('systemSettingsUpdated', handleSettingsUpdate);
    
    return () => {
      window.removeEventListener('systemSettingsUpdated', handleSettingsUpdate);
    };
  }, [fetchSettings]);

  // Funkcija za ručno osvježavanje settings-a
  const refetch = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return { systemSettings, loading, error, refetch };
};
