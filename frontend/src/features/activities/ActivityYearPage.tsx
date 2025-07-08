import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '@/utils/config';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import { calculateSimpleHours } from '@/utils/activityHours';

// Sučelja za podatke
interface Activity {
  activity_id: number;
  title: string;
  start_date: string;
}

interface ActivityParticipation {
  activity: Activity;
  start_time?: string;
  end_time?: string;
  manual_hours?: number;
}

const ActivityYearPage: React.FC = () => {
  const { memberId, year } = useParams<{ memberId: string; year: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [participations, setParticipations] = useState<ActivityParticipation[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!memberId || !year) return;
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');

      try {
        const response = await axios.get(`${API_BASE_URL}/activities/member/${memberId}/${year}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setParticipations(response.data || []);
      } catch (err) {
        console.error(`Error fetching activities for year ${year}:`, err);
        setError('Nije moguće učitati aktivnosti. Molimo pokušajte ponovno.');
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [memberId, year]);

  if (loading) {
    return <div className="p-6"><div className="h-16 bg-gray-200 animate-pulse rounded-md w-1/2 mx-auto"></div></div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-600 bg-red-50 rounded-md">{error}</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate(`/members/${memberId}/activities-overview`)} className="flex items-center text-blue-600 hover:underline mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Povratak na pregled po godinama
        </button>

        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Aktivnosti za {year}.</h1>
        </div>

        {participations.length === 0 ? (
          <div className="text-center bg-white p-8 rounded-lg shadow-md">
            <p className="text-gray-500">Nema zabilježenih aktivnosti za ovu godinu.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {participations.map(participation => {
              const hours = calculateSimpleHours(participation);
              return (
                <Link 
                  to={`/activities/${participation.activity.activity_id}`} 
                  key={participation.activity.activity_id} 
                  className="block bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
                >
                  <div className="flex justify-between items-center">
                    <p className="font-semibold text-gray-700">{participation.activity.title}</p>
                    <div className="flex items-center text-sm text-gray-500 space-x-4">
                      <span className="flex items-center"><Calendar className="h-4 w-4 mr-1" />{new Date(participation.activity.start_date).toLocaleDateString('hr-HR')}</span>
                      <span className="flex items-center"><Clock className="h-4 w-4 mr-1" />{hours.toFixed(2)} h</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityYearPage;
