import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@components/ui/card';
import { Alert, AlertDescription } from '@components/ui/alert';
import { getActivityTypes, getAllActivities, getActivityById } from '@/utils/api/apiActivities';
import { ActivityType, Activity, ActivityStatus } from '@shared/activity.types';
import { Badge } from '@components/ui/badge';
import { parseISO } from 'date-fns';
import { Activity as ActivityIcon, Clock } from 'lucide-react';
import { calculateGrandTotalHours, calculateTotalActivityHours, formatHoursToHHMM } from '@/utils/activityHours';

const ActivitiesList: React.FC = () => {
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // 1. Prvo dohvaćamo tipove i osnovne podatke o aktivnostima
      const [types, basicActivities] = await Promise.all([
        getActivityTypes(),
        getAllActivities(),
      ]);
      setActivityTypes(types);
      
      // 2. Za svaku završenu aktivnost dohvaćamo detalje s podacima o sudionicima
      const completedActivities = basicActivities.filter(activity => 
        activity.status === 'COMPLETED'
      );
      
      // 3. Za svaku aktivnost dohvaćamo detalje kako bismo dobili točne podatke o sudionicima
      const detailedActivitiesPromises = completedActivities.map(activity => 
        getActivityById(activity.activity_id.toString())
      );
      
      // 4. Čekamo da se dohvate svi detalji
      const detailedActivities = await Promise.all(detailedActivitiesPromises);
      
      // 5. Spajamo osnovne aktivnosti s detaljnima (za završene aktivnosti)
      const enhancedActivities = basicActivities.map(basicActivity => {
        // Ako je ova aktivnost dovršena, nađi njene detalje
        if (basicActivity.status === 'COMPLETED') {
          const detailedActivity = detailedActivities.find(
            detailedAct => detailedAct.activity_id === basicActivity.activity_id
          );
          return detailedActivity || basicActivity;
        }
        return basicActivity;
      });
      
      console.log('Enhancing activities with detailed participant data', enhancedActivities);
      setAllActivities(enhancedActivities);
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

  // Računamo ukupan broj sati iz svih kategorija
  // Prvo računamo sate po kategoriji i spremimo ih u mapu
  const categoryHoursMap: Record<number, number> = {};
  
  // Filtriramo samo završene aktivnosti
  const completedActivities = allActivities.filter(activity => activity.status === 'COMPLETED');
  
  // Detaljni debug log
  console.log('Sve aktivnosti:', allActivities);
  console.log('Završene aktivnosti:', completedActivities);
  console.log('Imaju li aktivnosti podatke o sudionicima?', completedActivities.map(a => a.participants?.length || 0));
  
  // Direktno računamo ukupne sate svih aktivnosti, uključujući sve sudionike
  const totalCompletedHours = calculateGrandTotalHours(completedActivities);
  console.log('Izračunati ukupni sati:', totalCompletedHours);
  
  // Računamo sate po kategoriji za prikaz u karticama
  activityTypes.forEach(type => {
    // Filtriramo samo završene aktivnosti ove kategorije
    const typeActivities = completedActivities.filter(activity => activity.type_id === type.type_id);
    
    // Koristimo centralnu funkciju za izračun ukupnih sati za ovu kategoriju
    const categoryTotal = calculateGrandTotalHours(typeActivities);
    
    // Spremamo izračunate sate za ovu kategoriju
    categoryHoursMap[type.type_id] = categoryTotal;
  });

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
                  <Badge variant="secondary" className="text-lg">{formatHoursToHHMM(totalCompletedHours)} h</Badge>
              </CardHeader>
          </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {activityTypes.length > 0 ? (
          activityTypes.map((type) => {
            // Računamo ukupne sate za aktivnosti ove kategorije
            const typeActivities = allActivities.filter(activity => 
              activity.type_id === type.type_id && activity.status === 'COMPLETED'
            );
            const categoryHours = calculateGrandTotalHours(typeActivities);
            
            return (
              <Link to={`/activities/category/${type.type_id}`} key={type.type_id}>
                <Card className="hover:bg-muted/50 transition-colors">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ActivityIcon className="h-6 w-6" />
                      {type.name}
                    </CardTitle>
                    {type.description && <CardDescription>{type.description}</CardDescription>}
                  </CardHeader>
                  {categoryHours > 0 && (
                    <CardFooter className="pt-0 flex justify-between text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        <span>Ukupno sati:</span>
                      </div>
                      <Badge variant="outline">{formatHoursToHHMM(categoryHours)} h</Badge>
                    </CardFooter>
                  )}
                </Card>
              </Link>
            );
          })
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