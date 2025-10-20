// frontend/components/ActivityHistory.tsx
import { useState, useEffect, useCallback } from 'react';
import { TenantLink } from '../src/components/TenantLink';
import { History } from 'lucide-react'; // Mijenjamo ikonu
import { useTranslation } from 'react-i18next';
import { getMemberAnnualStats } from '../src/utils/api';

interface Props {
  memberId: number;
}

interface AnnualStat {
  year: number;
  total_hours: number;
  total_activities: number;
}

export const ActivityHistory: React.FC<Props> = ({ memberId }) => {
  const { t } = useTranslation('profile');
  const [activityTotals, setActivityTotals] = useState({ activities: 0, hours: 0 });
  const [loading, setLoading] = useState(true);

  const fetchAnnualStats = useCallback(async () => {
    if (!memberId) return;
    setLoading(true);
    try {
      // Tipičan odgovor API-ja je lista AnnualStat; lokalna asercija tipa bez mijenjanja API utila
      const stats = (await getMemberAnnualStats(memberId)) as AnnualStat[];
      const totals = stats.reduce<{ activities: number; hours: number }>((acc, stat: AnnualStat) => {
        acc.activities += stat.total_activities;
        // Sate i dalje dohvaćamo, ali ih nećemo prikazati
        acc.hours += Number(stat.total_hours ?? 0);
        return acc;
      }, { activities: 0, hours: 0 });

      setActivityTotals(totals);
    } catch (err) {
      console.error("Error fetching annual stats for component:", err);
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    void fetchAnnualStats();
  }, [fetchAnnualStats]);

  return (
    <TenantLink
      to={`/members/${memberId}/activities-overview`}
      className="block bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
    >
      {/* Naslov s ikonom na lijevoj strani */}
      <div className="flex items-center mb-4">
        <History className="h-5 w-5 mr-3 text-gray-500" />
        <h3 className="text-gray-700 font-semibold">{t('activityHistory.title')}</h3>
      </div>
      
      {/* Prikaz samo ukupnog broja aktivnosti */}
      <div className="text-center">
        {loading ? (
          <div className="h-8 bg-gray-200 animate-pulse rounded-md w-1/2 mx-auto"></div>
        ) : (
          <div>
            <p className="text-3xl font-bold text-gray-800">{activityTotals.activities}</p>
            <p className="text-sm text-gray-500">{t('activityHistory.totalActivities')}</p>
          </div>
        )}
      </div>
    </TenantLink>
  );
};

export default ActivityHistory;