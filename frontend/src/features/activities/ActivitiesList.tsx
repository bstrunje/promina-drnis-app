import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription } from '@components/ui/card';
import { Alert, AlertDescription } from '@components/ui/alert';
import { getActivityTypes, getAllActivities } from '@/utils/api/apiActivities';
import { ActivityType, Activity, ActivityStatus } from '@shared/activity.types';
import { Badge } from '@components/ui/badge';
import { parseISO } from 'date-fns';
import { Activity as ActivityIcon } from 'lucide-react';

const ActivitiesList: React.FC = () => {
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [types, activities] = await Promise.all([
        getActivityTypes(),
        getAllActivities(),
      ]);
      setActivityTypes(types);
      setAllActivities(activities);
      setError(null);
    } catch (err) {
      console.error('Greška prilikom dohvaćanja podataka:', err);
      setError('Došlo je do pogreške prilikom dohvaćanja podataka.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const totalCompletedHours = allActivities
    .filter(activity => activity.status === 'COMPLETED' && activity.actual_start_time && activity.actual_end_time)
    .reduce((total, activity) => {
      const startTime = new Date(activity.actual_start_time!);
      const endTime = new Date(activity.actual_end_time!);
      const diff = endTime.getTime() - startTime.getTime();
      return total + (diff > 0 ? diff / (1000 * 60 * 60) : 0);
    }, 0);

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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Aktivnosti</h1>
        <p className="text-muted-foreground">Pregledajte i sudjelujte u nadolazećim aktivnostima.</p>
      </div>

      <div className="mb-6">
          <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Ukupno odrađenih sati</CardTitle>
                  <Badge variant="secondary" className="text-lg">{totalCompletedHours.toFixed(1)} h</Badge>
              </CardHeader>
          </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {activityTypes.length > 0 ? (
          activityTypes.map((type) => (
            <Link to={`/activities/category/${type.type_id}`} key={type.type_id}>
              <Card className="hover:bg-muted/50 transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ActivityIcon className="h-6 w-6" />
                    {type.name}
                  </CardTitle>
                  {type.description && <CardDescription>{type.description}</CardDescription>}
                </CardHeader>
              </Card>
            </Link>
          ))
        ) : (
          <div className="col-span-full flex items-center justify-center h-40 text-gray-500">
            <div className="text-center">
              <ActivityIcon className="h-12 w-12 mx-auto mb-2" />
              <p>Nema definiranih kategorija aktivnosti.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivitiesList;