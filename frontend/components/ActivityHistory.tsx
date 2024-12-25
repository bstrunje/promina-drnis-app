// frontend/components/ActivityHistory.tsx
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/card';
import { getMemberActivities } from '../src/utils/api';

interface Props {
  memberId: number;
}

interface MemberActivity {
  activity_id: number;
  title: string;
  date: string;
  hours_spent: number;
}

const ActivityHistory: React.FC<Props> = ({ memberId }) => {
  const [activities, setActivities] = useState<MemberActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMemberActivities();
  }, [memberId]);

  const fetchMemberActivities = async () => {
    try {
      const data = await getMemberActivities(memberId);
      setActivities(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading activities...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity History</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div 
                key={activity.activity_id}
                className="border-l-2 border-blue-500 pl-4 py-2"
              >
                <div className="font-medium">{activity.title}</div>
                <div className="text-sm text-gray-600">
                  {new Date(activity.date).toLocaleDateString()}
                </div>
                <div className="text-sm text-gray-600">
                  Hours: {activity.hours_spent}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500 text-center py-4">
            No activities recorded yet
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityHistory;