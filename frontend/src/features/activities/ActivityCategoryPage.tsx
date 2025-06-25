import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Activity as ActivityIcon, ArrowLeft, Calendar, Clock, MapPin } from 'lucide-react';
import { Alert, AlertDescription } from '@components/ui/alert';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { getActivityTypeById, getActivitiesByTypeId } from '@/utils/api';
import { Activity, ActivityType } from '@shared/activity.types';
import { format } from 'date-fns';

const ActivityCategoryPage: React.FC = () => {
  const { type_id } = useParams<{ type_id: string }>();
  const [activityType, setActivityType] = useState<ActivityType | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      console.log(`[DEBUG] Fetching data for type_id: ${id}`);

      console.log('[DEBUG] Fetching activity type details...');
      const typeData = await getActivityTypeById(id);
      console.log('[DEBUG] Fetched activity type details:', typeData);
      setActivityType(typeData);

      console.log('[DEBUG] Fetching activities for this type...');
      const activitiesData = await getActivitiesByTypeId(id);
      console.log('[DEBUG] Fetched activities:', activitiesData);
      setActivities(activitiesData);
    } catch (err) {
      setError('Došlo je do pogreške prilikom dohvaćanja podataka.');
      console.error('[DEBUG] Error in fetchData:', err);
    } finally {
      console.log('[DEBUG] Finished fetching, setting loading to false.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (type_id) {
      const numericTypeId = parseInt(type_id, 10);
      console.log(`[DEBUG] useEffect triggered. type_id: ${type_id}, numericTypeId: ${numericTypeId}`);
      if (!isNaN(numericTypeId)) {
        fetchData(numericTypeId);
      }
    }
  }, [type_id, fetchData]);

  if (loading) return <div className="p-6">Učitavanje...</div>;
  if (error) return (
    <div className="p-6">
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <Button asChild variant="outline" className="mb-4">
          <Link to="/activities">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Sve kategorije
          </Link>
        </Button>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ActivityIcon className="h-8 w-8" />
          {activityType?.name || 'Aktivnosti'}
        </h1>
        <p className="text-muted-foreground">{activityType?.description}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {activities.length > 0 ? (
          activities.map((activity) => (
            <Card key={activity.activity_id}>
              <CardHeader>
                <CardTitle>{activity.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(activity.start_date), 'dd.MM.yyyy.')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{format(new Date(activity.start_date), 'HH:mm')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{activity.location || 'N/A'}</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link to={`/activities/${activity.activity_id}`}>Detalji</Link>
                </Button>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center text-muted-foreground">
            <p>Trenutno nema planiranih aktivnosti u ovoj kategoriji.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityCategoryPage;