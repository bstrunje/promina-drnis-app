import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Activity as ActivityIcon, ArrowLeft, Calendar, Clock, MapPin, PlusCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@components/ui/alert';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { getActivityTypes, getActivitiesByTypeId } from '@/utils/api/apiActivities';
import { Activity, ActivityType, ActivityStatus } from '@shared/activity.types';
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import CreateActivityModal from './CreateActivityModal';
import { Badge } from '@components/ui/badge';

const ActivityCategoryPage: React.FC = () => {
  const { type_id: activityTypeId } = useParams<{ type_id: string }>();
  const [activityType, setActivityType] = useState<ActivityType | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!activityTypeId) return;
    try {
      setLoading(true);
      const types = await getActivityTypes();
      const currentType = types.find(t => t.type_id.toString() === activityTypeId);
      setActivityType(currentType || null);

      if (currentType) {
        const activitiesData = await getActivitiesByTypeId(activityTypeId);
        setActivities(activitiesData);
      }
      setError(null);
    } catch (err) {
      console.error('Greška prilikom dohvaćanja podataka:', err);
      setError('Došlo je do pogreške prilikom dohvaćanja podataka.');
    } finally {
      setLoading(false);
    }
  }, [activityTypeId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleActivityCreated = () => {
    setCreateModalOpen(false);
    void fetchData();
  };

  const calculateDuration = (
    start: string | Date | null,
    end: string | Date | null
  ): string => {
    if (!start || !end) return '0h 0m';
    const startDate = typeof start === 'string' ? new Date(start) : start;
    const endDate = typeof end === 'string' ? new Date(end) : end;
    const diff = endDate.getTime() - startDate.getTime();
    if (diff <= 0) return '0h 0m';

    const totalMinutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}h ${minutes}m`;
  };

  const totalCompletedHours = activities
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
      <div className="mb-6">
        <Button asChild variant="outline" className="mb-4">
          <Link to="/activities">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Sve kategorije
          </Link>
        </Button>
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ActivityIcon className="h-8 w-8" />
            {activityType?.name || 'Aktivnosti'}
          </h1>
          {(user?.role === 'member_administrator' || user?.role === 'member_superuser') && (
            <Button onClick={() => setCreateModalOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Kreiraj novu aktivnost
            </Button>
          )}
        </div>
        <p className="text-muted-foreground">{activityType?.description}</p>
      </div>

      <div className="mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Ukupno odrađenih sati u kategoriji</CardTitle>
            <Badge variant="secondary" className="text-lg">{totalCompletedHours.toFixed(1)} h</Badge>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {activities.length > 0 ? (
          activities.map(activity => {
            return (
              <Link to={`/activities/${activity.activity_id}`} key={activity.activity_id} className="block">
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle>{activity.name}</CardTitle>
                      {activity.status === 'COMPLETED' && (
                        <Badge variant="outline">
                          {calculateDuration(
                            activity.actual_start_time,
                            activity.actual_end_time
                          )}
                        </Badge>
                      )}
                    </div>
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
                  </CardContent>
                </Card>
              </Link>
            );
          })
        ) : (
          <div className="col-span-full text-center text-muted-foreground">
            <p>Trenutno nema planiranih aktivnosti u ovoj kategoriji.</p>
          </div>
        )}
      </div>

      {(user?.role === 'member_administrator' || user?.role === 'member_superuser') && (
        <CreateActivityModal
          isOpen={isCreateModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onActivityCreated={handleActivityCreated}
          activityTypeId={activityTypeId || null}
        />
      )}
    </div>
  );
};

export default ActivityCategoryPage;