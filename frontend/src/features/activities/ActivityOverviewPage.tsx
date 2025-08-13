import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '@/utils/config';
import { Calendar, ChevronRight } from 'lucide-react';
import BackToDashboard from '@components/BackToDashboard';
import { formatHoursToHHMM } from '@/utils/activityHours';
import { useTranslation } from 'react-i18next';

// Sučelje za člana s ukupnim satima kroz povijest
interface Member {
  full_name: string;
  total_hours: number;
}

// Sučelje za godišnje statistike ostaje isto
interface AnnualStat {
  year: number;
  total_hours: number;
  total_activities: number;
}

const ActivityOverviewPage: React.FC = () => {
  const { memberId } = useParams<{ memberId: string }>();
  const { t } = useTranslation('activities');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [annualStats, setAnnualStats] = useState<AnnualStat[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!memberId) return;
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');

      try {
        // Dohvaćamo samo podatke o članu i godišnje statistike
        const [memberRes, statsRes] = await Promise.all([
          axios.get<Member>(`${API_BASE_URL}/members/${memberId}`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get<AnnualStat[]>(`${API_BASE_URL}/members/${memberId}/annual-stats`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        setMember(memberRes.data);
        setAnnualStats(statsRes.data ?? []);

      } catch (err) {
        console.error("Error fetching activity overview data:", err);
        setError(t('activityOverview.errorFetchingData'));
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [memberId, t]);

  const sortedStats = annualStats.sort((a, b) => b.year - a.year);

  if (loading) {
    return <div className="p-6"><div className="h-16 bg-gray-200 animate-pulse rounded-md w-1/2 mx-auto"></div></div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-600 bg-red-50 rounded-md">{error}</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <BackToDashboard />
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{t('activityOverview.title')}</h1>
              <p className="text-lg text-gray-600">{t('activityOverview.memberLabel')} {member?.full_name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">{t('activityOverview.totalHours')}</p>
              <p className="text-xl font-bold text-gray-800">{formatHoursToHHMM((member?.total_hours ?? 0) / 60)}</p>
            </div>
          </div>
        </div>

        {sortedStats.length === 0 ? (
          <div className="text-center bg-white p-8 rounded-lg shadow-md">
            <p className="text-gray-500">{t('activityOverview.noActivities')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-700">{t('activityOverview.yearView')}</h2>
            {sortedStats.map(stat => (
              <Link 
                to={`/members/${memberId}/activities/${stat.year}`}
                key={stat.year} 
                className="block bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Calendar className="h-6 w-6 mr-4 text-blue-600" />
                    <div>
                      <p className="font-bold text-xl text-gray-800">{stat.year}.</p>
                      <div className="flex space-x-4 text-sm text-gray-500">
                        <span>{t('activityOverview.activitiesCount')}: <span className="font-semibold">{stat.total_activities}</span></span>
                        <span>{t('activityOverview.hoursCount')}: <span className="font-semibold">{formatHoursToHHMM(stat.total_hours)}</span></span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-6 w-6 text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityOverviewPage;
