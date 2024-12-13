//frontend/src/features/activities/ActivitiesList.tsx
import React, { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
import { Member } from '@shared/types/member';
import { Alert, AlertDescription } from '@components/ui/alert';

interface ActivityItem {
  activity_id: number;
  title: string;
  description: string;
  start_date: Date;
  end_date: Date;
  location: string;
  difficulty_level: string;
  max_participants: number;
  created_by: Member;
  participants: Member[];
}

const ActivitiesList: React.FC = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/activities', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch activities');
      const data = await response.json();
      setActivities(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Activities</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Create Activity
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {activities.length > 0 ? (
          <div className="grid gap-4">
            {activities.map((activity) => (
              <div 
                key={activity.activity_id}
                className="border rounded-lg p-4"
              >
                <h3 className="font-medium">{activity.title}</h3>
                <p className="text-gray-600">{activity.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-40 text-gray-500">
            <div className="text-center">
              <Activity className="h-12 w-12 mx-auto mb-2" />
              <p>No activities recorded yet</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivitiesList;