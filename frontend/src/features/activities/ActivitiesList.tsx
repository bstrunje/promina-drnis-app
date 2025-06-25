import React, { useState, useEffect, useCallback } from 'react';
import { Activity, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription } from '@components/ui/alert';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@components/ui/card';
import { Button } from '@components/ui/button';

interface ActivityType {
  type_id: number;
  name: string;
  description?: string;
}

const ActivitiesList: React.FC = () => {
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivityTypes = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/activities/types', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch activity types');
      
      const data = await response.json() as ActivityType[];
      setActivityTypes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity types');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchActivityTypes();
  }, [fetchActivityTypes]);

  if (loading) {
    return <div className="p-6">Učitavanje...</div>;
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
        <h1 className="text-2xl font-bold">Kategorije aktivnosti</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {activityTypes.length > 0 ? (
          activityTypes.map((type) => (
            <Card key={type.type_id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{type.name}</CardTitle>
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
              <Activity className="h-12 w-12 mx-auto mb-2" />
              <p>Nema definiranih kategorija aktivnosti.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivitiesList;