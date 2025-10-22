import { useState, useEffect } from 'react';
import { SystemSettings } from '@shared/settings';
import { getSystemSettings } from '../utils/api/apiSettings';

/**
 * Hook za dohvaćanje system settings
 */
export const useSystemSettings = () => {
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Provjeri postoji li auth token
        const token = localStorage.getItem('authToken');
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
    };

    void fetchSettings();
  }, []);

  return { systemSettings, loading, error };
};
