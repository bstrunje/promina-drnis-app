// features/systemManager/hooks/useDashboardStats.ts
import { useState, useEffect, useCallback } from 'react';
import { getSystemManagerDashboardStats, SystemManagerDashboardStats } from '../utils/systemManagerApi';

/**
 * Hook za dohvat i upravljanje statistikama dashboarda
 * Enkapsulira logiku učitavanja, osvježavanja i praćenja grešaka
 */
export const useDashboardStats = (activeTab: string) => {
  // Osnovno stanje statistika
  const [stats, setStats] = useState<SystemManagerDashboardStats>({
    totalMembers: 0,
    registeredMembers: 0,
    activeMembers: 0,
    pendingApprovals: 0,
    recentActivities: 0,
    systemHealth: 'Nepoznato',
    lastBackup: 'Nikad',
  });
  
  // Stanje učitavanja i grešaka
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  const [statsError, setStatsError] = useState<string | null>(null);

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

  // Dohvat statistika pri promjeni aktivnog taba
  useEffect(() => {
    if (activeTab === 'dashboard') {
      void fetchDashboardStats();
    }
  }, [activeTab, fetchDashboardStats]);

  return {
    stats,
    statsLoading,
    statsError,
    refreshDashboardStats: fetchDashboardStats
  };
};

export default useDashboardStats;
