// features/systemManager/hooks/useDashboardStats.ts
import { useState, useEffect, useCallback } from 'react';
import { getSystemManagerDashboardStats, SystemManagerDashboardStats } from '../utils/systemManagerApi';

/**
 * Hook za dohvat i upravljanje statistikama dashboarda
 * Enkapsulira logiku učitavanja, osvježavanja i praćenja grešaka
 */
export const useDashboardStats = (activeTab: string) => {
  // Cache settings
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minuta
  
  // Osnovno stanje statistika
  const [stats, setStats] = useState<SystemManagerDashboardStats>({
    totalMembers: 0,
    registeredMembers: 0,
    activeMembers: 0,
    pendingApprovals: 0,
    recentActivities: 0,
    systemHealth: 'Unknown',
    lastBackup: 'Never',
    recentActivitiesList: [],
    healthDetails: {
      status: 'Warning' as const,
      dbConnection: false,
      diskSpace: { available: 0, total: 0, percentUsed: 0 },
      memory: { available: 0, total: 0, percentUsed: 0 },
      uptime: 0,
      lastCheck: new Date()
    },
    backupDetails: {
      lastBackup: null,
      backupSize: null,
      backupLocation: null,
      status: 'Unknown'
    }
  });
  
  // Stanje učitavanja i grešaka
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);

  // Funkcija za dohvat statistika
  const fetchDashboardStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const data = await getSystemManagerDashboardStats();
      setStats(data);
      setStatsError(null);
    } catch (err) {
      if (err instanceof Error) {
        setStatsError(err.message);
      } else {
        setStatsError('Došlo je do greške prilikom dohvata statistika dashboarda.');
      }
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Dohvat statistika pri promjeni aktivnog taba s caching
  useEffect(() => {
    if (activeTab === 'dashboard') {
      const now = Date.now();
      const shouldFetch = now - lastFetch > CACHE_DURATION;
      
      if (shouldFetch) {
        void fetchDashboardStats();
        setLastFetch(now);
      } else {
        // Use cached data, but set loading to false if it's still loading
        if (statsLoading) {
          setStatsLoading(false);
        }
      }
    }
  }, [activeTab, lastFetch, statsLoading, fetchDashboardStats, CACHE_DURATION]);

  // Funkcija za forsirano osvježavanje cache-a
  const refreshStats = useCallback(async () => {
    setLastFetch(0); // Reset cache
    await fetchDashboardStats();
  }, [fetchDashboardStats]);

  return {
    stats,
    statsLoading,
    statsError,
    fetchDashboardStats,
    refreshStats
  };
};

export default useDashboardStats;
