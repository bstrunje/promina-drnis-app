import React, { useState, useEffect } from 'react';
const isDev = import.meta.env.DEV;
import { useParams } from 'react-router-dom';
import { TenantLink } from '../../components/TenantLink';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import { formatHoursToHHMM } from '@/utils/activityHours';
import { useTranslation } from 'react-i18next';
import { useBranding } from '../../hooks/useBranding';
import { useTenantNavigation } from '../../hooks/useTenantNavigation';
import api from '@/utils/api/apiConfig';

// Sučelja za podatke
interface Activity {
  activity_id: number;
  name: string;
  date: string;
  hours_spent?: number;
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  activity_type?: {
    name: string;
    custom_label?: string | null;
  };
}

interface MemberWithActivities {
  member_id: number;
  full_name: string;
  activities: Activity[];
}

const ActivityYearPage: React.FC = () => {
  const { t } = useTranslation('activities');
  const { getPrimaryColor } = useBranding();
  const { memberId, year } = useParams<{ memberId: string; year: string }>();
  const { navigateTo } = useTenantNavigation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memberWithActivities, setMemberWithActivities] = useState<MemberWithActivities | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!memberId || !year) return;
      setLoading(true);
      setError(null);

      try {
        // api.get automatski dodaje tenant parameter i Authorization header
        const response = await api.get<MemberWithActivities>(`/members/${memberId}/activities?year=${year}`);
        if (isDev) console.log('[ActivityYearPage] API response:', response.data);
        if (isDev) console.log('[ActivityYearPage] First activity status:', response.data.activities[0]?.status, typeof response.data.activities[0]?.status);
        setMemberWithActivities(response.data);
      } catch (err) {
        if (isDev) console.error(`Error fetching activities for year ${year}:`, err);
        setError(t('activityYear.errorFetchingData'));
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [memberId, year, t]);

  // Izračunaj ukupne sate za godinu
  const totalHoursForYear = memberWithActivities?.activities.reduce((total, activity) => {
    return total + (activity.hours_spent ?? 0);
  }, 0) ?? 0;

  if (loading) {
    return <div className="p-6"><div className="h-16 bg-gray-200 animate-pulse rounded-md w-1/2 mx-auto"></div></div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-600 bg-red-50 rounded-md">{error}</div>;
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigateTo(`/members/${memberId}/activities-overview`)} className="flex items-center hover:underline mb-4" style={{ color: getPrimaryColor() }}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Povratak na pregled po godinama
        </button>

        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{t('activityYear.title', { year })}</h1>
              <p className="text-lg text-gray-600">{t('activityOverview.memberLabel')} {memberWithActivities?.full_name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">{t('activityYear.totalHoursInYear', { year })}</p>
              <p className="text-xl font-bold text-gray-800">{formatHoursToHHMM(totalHoursForYear)}</p>
            </div>
          </div>
        </div>

        {!memberWithActivities?.activities || memberWithActivities.activities.length === 0 ? (
          <div className="text-center bg-white p-8 rounded-lg shadow-md">
            <p className="text-gray-500">{t('activityYear.noActivities')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {memberWithActivities.activities.map(activity => {
              return (
                <TenantLink
                  to={`/activities/${activity.activity_id}`}
                  key={activity.activity_id}
                  className="block bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {/* Status indicator */}
                      <div className={`w-3 h-3 rounded-full ${
                        activity.status === 'PLANNED' ? 'bg-green-600' :
                        activity.status === 'ACTIVE' ? 'bg-blue-600' :
                        activity.status === 'COMPLETED' ? 'bg-gray-400' :
                        activity.status === 'CANCELLED' ? 'bg-red-600' : 'bg-gray-300'
                      }`} title={activity.status}></div>
                      <div>
                        <p className="font-semibold text-gray-700">{activity.name}</p>
                        <p className="text-xs text-gray-500">{activity.activity_type?.custom_label ?? activity.activity_type?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-gray-500 space-x-4">
                      <span className="flex items-center"><Calendar className="h-4 w-4 mr-1" />{new Date(activity.date).toLocaleDateString('hr-HR')}</span>
                      <span className="flex items-center"><Clock className="h-4 w-4 mr-1" />{formatHoursToHHMM(activity.hours_spent ?? 0)}</span>
                    </div>
                  </div>
                </TenantLink>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityYearPage;
