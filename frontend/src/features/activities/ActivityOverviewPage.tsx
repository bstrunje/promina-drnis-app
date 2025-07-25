import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '@/utils/config';
import { Calendar, ChevronRight } from 'lucide-react';
import BackToDashboard from '@components/BackToDashboard';
import { formatHoursToHHMM } from '@/utils/activityHours';

// Sučelje za člana ostaje isto
interface Member {
  full_name: string;
}

// Sučelje za godišnje statistike ostaje isto
interface AnnualStat {
  year: number;
  total_hours: number;
  total_activities: number;
}

const ActivityOverviewPage: React.FC = () => {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
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
          axios.get(`${API_BASE_URL}/members/${memberId}`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_BASE_URL}/members/${memberId}/annual-stats`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        setMember(memberRes.data);
        setAnnualStats(statsRes.data || []);

      } catch (err) {
        console.error("Error fetching activity overview data:", err);
        setError('Nije moguće učitati podatke. Molimo pokušajte ponovno.');
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [memberId]);

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
          <h1 className="text-3xl font-bold text-gray-800">Sve moje aktivnosti</h1>
          <p className="text-lg text-gray-600">Član: {member?.full_name}</p>
        </div>

        {sortedStats.length === 0 ? (
          <div className="text-center bg-white p-8 rounded-lg shadow-md">
            <p className="text-gray-500">Član nema zabilježenih aktivnosti.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-700">Pregled po godinama</h2>
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
                        <span>Aktivnosti: <span className="font-semibold">{stat.total_activities}</span></span>
                        <span>Sati: <span className="font-semibold">{formatHoursToHHMM(stat.total_hours)}</span></span>
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
