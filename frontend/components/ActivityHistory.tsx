// frontend/components/ActivityHistory.tsx
import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/card';
import { getMemberActivities } from '../src/utils/api';
import { getCurrentDate, formatDate, getCurrentYear, parseDate } from "../src/utils/dateUtils";
import { History } from 'lucide-react';

interface Props {
  memberId: number;
}

interface MemberActivity {
  activity_id: number;
  title: string;
  date: string;
  hours_spent: number;
}

export const ActivityHistory: React.FC<Props> = ({ memberId }) => {
  const [activities, setActivities] = useState<MemberActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dodaj useMemo za stabilnost reference
  const fetchActivities = useCallback(async () => {
    if (!memberId) return;
    
    try {
      const data = await getMemberActivities(memberId);
      setActivities(data);
    } catch (error) {
      console.error('Error fetching activities:', error);
      setError(error instanceof Error ? error.message : 'Error fetching activities');
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  // Koristi useEffect s dependency listom
  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  if (loading) {
    return <div>Loading activities...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex items-center">
            <History className="w-5 h-5 mr-2" />
            Activity History
          </div>
        </CardTitle>
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
                {formatDate(activity.date)}
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