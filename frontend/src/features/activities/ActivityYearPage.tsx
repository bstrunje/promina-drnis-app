import React, { useState, useEffect } from 'react';
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
  start_date: string;
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}

interface ActivityParticipation {
  activity: Activity;
  recognized_hours: number;
}

interface Member {
  full_name: string;
}

const ActivityYearPage: React.FC = () => {
  const { t } = useTranslation('activities');
  const { getPrimaryColor } = useBranding();
  const { memberId, year } = useParams<{ memberId: string; year: string }>();
  const { navigateTo } = useTenantNavigation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [participations, setParticipations] = useState<ActivityParticipation[]>([]);
  const [member, setMember] = useState<Member | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!memberId || !year) return;
      setLoading(true);
      setError(null);

      try {
        // api.get automatski dodaje tenant parameter i Authorization header
        const [participationsRes, memberRes] = await Promise.all([
          api.get<ActivityParticipation[]>(`/activities/member/${memberId}/${year}`),
          api.get<Member>(`/members/${memberId}`)
        ]);
        setParticipations(participationsRes.data ?? []);
        setMember(memberRes.data);
      } catch (err) {
        console.error(`Error fetching activities for year ${year}:`, err);
        setError(t('activityYear.errorFetchingData'));
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [memberId, year, t]);

  // Izračunaj ukupne sate za godinu
  const totalHoursForYear = participations.reduce((total, participation) => {
    return total + (participation.recognized_hours || 0);
  }, 0);

  if (loading) {
    return <div className="p-6"><div className="h-16 bg-gray-200 animate-pulse rounded-md w-1/2 mx-auto"></div></div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-600 bg-red-50 rounded-md">{error}</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigateTo(`/members/${memberId}/activities-overview`)} className="flex items-center hover:underline mb-4" style={{ color: getPrimaryColor() }}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Povratak na pregled po godinama
        </button>

        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{t('activityYear.title', { year })}</h1>
              <p className="text-lg text-gray-600">{t('activityOverview.memberLabel')} {member?.full_name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">{t('activityYear.totalHoursInYear', { year })}</p>
              <p className="text-xl font-bold text-gray-800">{formatHoursToHHMM(totalHoursForYear)}</p>
            </div>
          </div>
        </div>

        {participations.length === 0 ? (
          <div className="text-center bg-white p-8 rounded-lg shadow-md">
            <p className="text-gray-500">{t('activityYear.noActivities')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {participations.map(participation => {
              return (
                <TenantLink
                  to={`/activities/${participation.activity.activity_id}`}
                  key={participation.activity.activity_id}
                  className="block bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {/* Status indicator */}
                      <div className={`w-3 h-3 rounded-full ${
                        participation.activity.status === 'PLANNED' ? 'bg-green-600' :
                        participation.activity.status === 'ACTIVE' ? 'bg-blue-600' :
                        participation.activity.status === 'COMPLETED' ? 'bg-gray-400' :
                        participation.activity.status === 'CANCELLED' ? 'bg-red-600' : 'bg-gray-300'
                      }`} title={participation.activity.status}></div>
                      <p className="font-semibold text-gray-700">{participation.activity.name}</p>
                    </div>
                    <div className="flex items-center text-sm text-gray-500 space-x-4">
                      <span className="flex items-center"><Calendar className="h-4 w-4 mr-1" />{new Date(participation.activity.start_date).toLocaleDateString('hr-HR')}</span>
                      <span className="flex items-center"><Clock className="h-4 w-4 mr-1" />{formatHoursToHHMM(participation.recognized_hours)}</span>
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
