import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getActivityById } from '../../utils/api/apiActivities';
import { Activity } from '@shared/activity.types';
import { useAuth } from '../../context/AuthContext';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { format } from 'date-fns';

const ActivityDetailPage: React.FC = () => {
  const { activityId } = useParams<{ activityId: string }>();
  const { user } = useAuth();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivity = async () => {
      if (!activityId) return;
      try {
        setLoading(true);
        const data = await getActivityById(activityId);
        setActivity(data);
      } catch (err) {
        setError('Greška pri dohvaćanju detalja aktivnosti.');
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [activityId]);

  if (loading) return <div>Učitavanje...</div>;
  if (error) return <div>{error}</div>;
  if (!activity) return <div>Aktivnost nije pronađena.</div>;

  const canEdit = user?.role === 'member_superuser' || user?.member_id === activity.organizer?.member_id;

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{activity.name}</CardTitle>
            {canEdit && (
              <Button asChild>
                <Link to={`/activities/${activity.activity_id}/edit`}>Uredi</Link>
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Organizator: {activity.organizer?.first_name} {activity.organizer?.last_name}
          </p>
          <p className="text-sm text-muted-foreground">
            Datum: {format(new Date(activity.start_date), 'dd.MM.yyyy. HH:mm')}
          </p>
        </CardHeader>
        <CardContent>
          <p>{activity.description}</p>
          <h3 className="font-bold mt-4">Sudionici ({activity._count?.participants || 0})</h3>
          {activity.participants && activity.participants.length > 0 ? (
            <ul>
              {activity.participants.map((p) => (
                <li key={p.member.member_id}>
                  {p.member.first_name} {p.member.last_name}
                </li>
              ))}
            </ul>
          ) : (
            <p>Nema prijavljenih sudionika.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityDetailPage;
