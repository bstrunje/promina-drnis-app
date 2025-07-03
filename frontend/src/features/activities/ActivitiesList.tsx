import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@components/ui/card';
import { Alert, AlertDescription } from '@components/ui/alert';
import { getActivityTypes, getAllActivities, getActivityById } from '@/utils/api/apiActivities';
import { ActivityType, Activity, ActivityStatus } from '@shared/activity.types';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { parseISO, format } from 'date-fns';
import { Activity as ActivityIcon, Clock, Calendar, PlusCircle } from 'lucide-react';
import { calculateGrandTotalHours, calculateTotalActivityHours, formatHoursToHHMM } from '@/utils/activityHours';
import { useAuth } from '@/context/AuthContext';
import CreateActivityModal from './CreateActivityModal';

const ActivitiesList: React.FC = () => {
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Dodajemo stanje za godine koje će biti prikazane
  const [activityYears, setActivityYears] = useState<number[]>([]);
  // Dodajemo stanje za modalni prozor za kreiranje aktivnosti
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const { user } = useAuth();

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

  // Učitavanje dostupnih godina kada se učitaju aktivnosti
  useEffect(() => {
    if (allActivities.length > 0) {
      // Izdvajamo jedinstvene godine iz svih aktivnosti
      const years = allActivities.map(activity => {
        const date = new Date(activity.start_date);
        return date.getFullYear();
      });
      
      // Sortiramo godine silazno (od najnovije prema starijima)
      const uniqueYears = Array.from(new Set(years)).sort((a, b) => b - a);
      setActivityYears(uniqueYears);
    }
  }, [allActivities]);

  // Filtriramo samo završene aktivnosti
  const completedActivities = allActivities.filter(activity => activity.status === 'COMPLETED');
  
  // Direktno računamo ukupne sate svih aktivnosti, uključujući sve sudionike
  const totalCompletedHours = calculateGrandTotalHours(completedActivities);
  
  // Računamo sate po godini za prikaz u karticama
  const yearHoursMap: Record<number, number> = {};
  activityYears.forEach(year => {
    const yearActivities = completedActivities.filter(activity => {
      const activityYear = new Date(activity.start_date).getFullYear();
      return activityYear === year;
    });
    
    const yearTotal = calculateGrandTotalHours(yearActivities);
    yearHoursMap[year] = yearTotal;
  });

  // Handler za osvježavanje aktivnosti nakon kreiranja nove
  const handleActivityCreated = () => {
    setCreateModalOpen(false);
    // Ponovno dohvaćanje aktivnosti
    void fetchData();
  };

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
        <div className="flex items-center gap-4">
          <p className="text-muted-foreground hidden md:block">Pregledajte i sudjelujte u nadolazećim aktivnostima.</p>
          {(user?.role === 'member_administrator' || user?.role === 'member_superuser') && (
            <Button onClick={() => setCreateModalOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nova aktivnost
            </Button>
          )}
        </div>
      </div>

      <div className="mb-6">
          <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Ukupno odrađenih sati</CardTitle>
                  <Badge variant="secondary" className="text-lg">{formatHoursToHHMM(totalCompletedHours)} h</Badge>
              </CardHeader>
          </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
        {activityYears.length > 0 ? (
          activityYears.map((year) => {
            // Računamo ukupne sate za aktivnosti ove godine
            const yearActivities = allActivities.filter(activity => {
              const activityYear = new Date(activity.start_date).getFullYear();
              return activityYear === year && activity.status === 'COMPLETED';
            });
            const yearHours = calculateGrandTotalHours(yearActivities);
            
            // Link bi vodio na posebnu stranicu za pregled aktivnosti po godini
            // Trenutno vodimo na istu stranicu, ali ovo bi se trebalo kasnije prilagoditi
            return (
              <Link to={`/activities/year/${year}`} key={year}>
                <Card className="hover:bg-muted/50 transition-colors">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 justify-center">
                      <Calendar className="h-6 w-6" />
                      {year}
                    </CardTitle>
                  </CardHeader>
                  {yearHours > 0 && (
                    <CardFooter className="pt-0 flex justify-between text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        <span>Ukupno sati:</span>
                      </div>
                      <Badge variant="outline">{formatHoursToHHMM(yearHours)} h</Badge>
                    </CardFooter>
                  )}
                </Card>
              </Link>
            );
          })
        ) : (
          <div className="col-span-full flex items-center justify-center h-40 text-gray-500">
            <div className="text-center">
              <Calendar className="h-12 w-12 mx-auto mb-2" />
              <p>Nema aktivnosti za prikaz.</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal za kreiranje aktivnosti */}
      {(user?.role === 'member_administrator' || user?.role === 'member_superuser') && (
        <CreateActivityModal 
          isOpen={isCreateModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onActivityCreated={handleActivityCreated}
          activityTypeId={activityTypes.length > 0 ? String(activityTypes[0].type_id) : null}
        />
      )}
    </div>
  );
};

export default ActivitiesList;