import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@components/ui/button';
import { ArrowLeft, PlusCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Alert, AlertDescription } from '@components/ui/alert';
import { Activity } from '@shared/activity';
import { useAuth } from '../../context/AuthContext';

interface ActivityType {
  type_id: number;
  name: string;
}

const ActivityCategoryPage: React.FC = () => {
  const { activityTypeId } = useParams<{ activityTypeId: string }>();
  const { user } = useAuth();
  const [category, setCategory] = useState<ActivityType | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canCreateActivity = user?.role === 'member_administrator' || user?.role === 'member_superuser';

  const fetchData = useCallback(async () => {
    if (!activityTypeId) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [categoryResponse, activitiesResponse] = await Promise.all([
        fetch(`/api/activities/types/${activityTypeId}`, { headers }),
        fetch(`/api/activities/category/${activityTypeId}`, { headers }),
      ]);

      if (!categoryResponse.ok) throw new Error('Failed to fetch category name');
      if (!activitiesResponse.ok) throw new Error('Failed to fetch activities');

      const categoryData = await categoryResponse.json() as ActivityType;
      const activitiesData = await activitiesResponse.json() as Activity[];

      setCategory(categoryData);
      setActivities(activitiesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [activityTypeId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (loading) {
    return <div>Učitavanje...</div>;
  }

  if (error) {
    return (
      <div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <Button asChild variant="outline">
          <Link to="/activities">
            <ArrowLeft className="mr-0 h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Sve kategorije</span>
          </Link>
        </Button>
        <h1 className="text-xl sm:text-2xl font-bold text-center px-2">{category?.name || 'Aktivnosti'}</h1>
        {canCreateActivity && (
          <Button>
            <PlusCircle className="mr-0 h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Kreiraj novu akciju</span>
          </Button>
        )}
      </div>

      {activities.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activities.map((activity) => (
            <Card key={activity.activity_id}>
              <CardHeader>
                <CardTitle>{activity.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{activity.description}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {new Date(activity.start_date).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
          <p>Nema akcija za prikaz u ovoj kategoriji.</p>
        </div>
      )}
    </div>
  );
};

export default ActivityCategoryPage;