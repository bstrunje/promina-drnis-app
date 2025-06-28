import React, { useState, useEffect, useCallback } from 'react';
import { Activity as ActivityIcon, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription } from '@components/ui/alert';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { getActivityTypes } from '@/utils/api';
import { ActivityType } from '@shared/activity.types';

const ActivitiesList: React.FC = () => {
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivityTypes = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Pozivam getActivityTypes API...');
      const data = await getActivityTypes();
      console.log('Odgovor od getActivityTypes API:', data);
      setActivityTypes(data);
    } catch (err) {
      console.error('Greška prilikom dohvaćanja tipova aktivnosti:', err);
      setError(err instanceof Error ? err.message : 'Failed to load activity types');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivityTypes();
  }, [fetchActivityTypes]);

  if (loading) return <div className="p-6">Učitavanje...</div>;
  if (error) return (
    <Alert variant="destructive">
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Aktivnosti</h1>
        <p className="text-muted-foreground">Pregledajte i sudjelujte u nadolazećim aktivnostima.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {activityTypes.length > 0 ? (
          activityTypes.map((type) => (
            <Card key={type.type_id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ActivityIcon className="h-5 w-5" />
                  {type.name}
                </CardTitle>
                {type.description && <CardDescription>{type.description}</CardDescription>}
              </CardHeader>
              <CardFooter className="mt-auto">
                <Button asChild className="w-full">
                  <Link to={`/activities/category/${type.type_id}`}>
                    Pregledaj akcije <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
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