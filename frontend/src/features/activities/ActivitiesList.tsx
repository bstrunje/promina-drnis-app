import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './activities.css';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@components/ui/card';
import { Alert, AlertDescription } from '@components/ui/alert';
import { getActivityTypes, getAllActivitiesWithParticipants } from '@/utils/api/apiActivities';
import { ActivityType, Activity, ActivityStatus } from '@shared/activity.types';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { parseISO, format } from 'date-fns';
import { Activity as ActivityIcon, Clock, Calendar, PlusCircle, AlertCircle, CheckCircle2, PlayCircle } from 'lucide-react';
import { calculateGrandTotalHours, calculateTotalActivityHours, formatHoursToHHMM } from '@/utils/activityHours';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';
import CreateActivityModal from './CreateActivityModal';

const ActivitiesList: React.FC = () => {
  const { t } = useTranslation('activities');
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
      // Optimizirani dohvat: jednim pozivom dohvaćamo sve potrebne podatke.
      const [types, activitiesWithDetails] = await Promise.all([
        getActivityTypes(),
        getAllActivitiesWithParticipants(), // Ovaj poziv sada vraća sve, uključujući sudionike
      ]);

      setActivityTypes(types);
      setAllActivities(activitiesWithDetails);
      setError(null);
    } catch (err) {
      console.error('Greška prilikom dohvaćanja podataka:', err);
      setError(t('list.error'));
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
        // Provjera ima li aktivnost datum početka
        if (!activity.start_date) return new Date().getFullYear(); // Defaultno trenutna godina
        
        // Izvlačimo godinu iz ISO formata ili direktno iz datuma
        let year;
        if (typeof activity.start_date === 'string') {
          // Ako je string, izvlačimo godinu iz ISO string formata (yyyy-mm-dd...)
          year = parseInt(activity.start_date.substring(0, 4), 10);
        } else {
          // Ako je Date objekt
          const date = new Date(activity.start_date);
          year = date.getFullYear();
        }
        
        return year;
      });
      
      // Sortiramo godine silazno (od najnovije prema starijima)
      const uniqueYears = Array.from(new Set(years)).sort((a, b) => b - a);
      setActivityYears(uniqueYears);
    }
  }, [allActivities]);

  // Dohvaćamo aktivnosti po statusu (ali zadržavamo sve aktivnosti u memoriji)
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

  if (loading) return <div className="p-6">{t('list.loading')}</div>;
  if (error) return (
    <div className="p-6">
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    </div>
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">{t('list.title')}</h1>
        <div className="flex items-center gap-4">
          <p className="text-muted-foreground hidden md:block">{t('list.description')}</p>
          {(user?.role === 'member_administrator' || user?.role === 'member_superuser') && (
            <Button size="sm" className="sm:size-md" onClick={() => setCreateModalOpen(true)}>
              <PlusCircle className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">{t('list.create')}</span>
            </Button>
          )}
        </div>
      </div>

      <div className="mb-6">
          <Card>
              <CardHeader className="flex flex-row items-center justify-between py-3 sm:py-6">
                  <CardTitle>
                    <span className="hidden sm:inline">{t('list.totalCompletedHours')}</span>
                    <span className="inline sm:hidden">{t('list.totalHours')}</span>
                  </CardTitle>
                  <Badge variant="secondary" className="text-lg">{formatHoursToHHMM(totalCompletedHours)} h</Badge>
              </CardHeader>
          </Card>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {activityYears.length > 0 ? (
          activityYears.map((year) => {
            // Računamo ukupne sate za aktivnosti ove godine (samo COMPLETED aktivnosti računamo u sate)
            const yearActivities = allActivities.filter(activity => {
              // Provjera ima li aktivnost datum početka
              if (!activity.start_date) return false;
              
              // Izvlačimo godinu iz ISO formata ili direktno iz datuma
              let activityYear;
              if (typeof activity.start_date === 'string') {
                // Ako je string, izvlačimo godinu iz ISO string formata (yyyy-mm-dd...)
                activityYear = parseInt(activity.start_date.substring(0, 4), 10);
              } else {
                // Ako je Date objekt
                const date = new Date(activity.start_date);
                activityYear = date.getFullYear();
              }
              
              return activityYear === year && activity.status === 'COMPLETED';
            });
            
            // Računamo ukupni broj aktivnosti u toj godini (sve aktivnosti, bez obzira na status)
            const totalYearActivities = allActivities.filter(activity => {
              // Provjera ima li aktivnost datum početka
              if (!activity.start_date) return false;
              
              // Izvlačimo godinu iz ISO formata ili direktno iz datuma
              let activityYear;
              if (typeof activity.start_date === 'string') {
                // Ako je string, izvlačimo godinu iz ISO string formata (yyyy-mm-dd...)
                activityYear = parseInt(activity.start_date.substring(0, 4), 10);
              } else {
                // Ako je Date objekt
                const date = new Date(activity.start_date);
                activityYear = date.getFullYear();
              }
              
              return activityYear === year;
            });
            const yearHours = calculateGrandTotalHours(yearActivities);

            // Provjera za aktivne i najavljene aktivnosti unutar godine
            const hasActive = totalYearActivities.some(a => a.status === 'ACTIVE');
            const hasPlanned = totalYearActivities.some(a => a.status === 'PLANNED');
            
            // Link bi vodio na posebnu stranicu za pregled aktivnosti po godini
            // Trenutno vodimo na istu stranicu, ali ovo bi se trebalo kasnije prilagoditi
            return (
              <Link to={`/activities/year/${year}`} key={year}>
                <Card className="hover:bg-muted/50 transition-colors activity-card">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 sm:h-6 sm:w-6" />
                        <span className="text-lg sm:text-xl">{year}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {hasActive && <div className="w-3 h-3 bg-blue-500 rounded-full" title={t('list.tooltips.activeActivities')}></div>}
                        {hasPlanned && <div className="w-3 h-3 bg-green-600 rounded-full" title={t('list.tooltips.plannedActivities')}></div>}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardFooter className="pt-0 pb-3 px-3 sm:px-6 sm:pb-6 flex flex-col gap-1 sm:gap-2">
                     {/* Broj aktivnosti u godini */}
                     <div className="flex justify-between text-muted-foreground w-full">
                       <div className="flex items-center gap-1 sm:gap-1.5">
                         <ActivityIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                         <span className="text-xs sm:text-sm">{t('list.activities')}</span>
                       </div>
                       <Badge variant="secondary" className="text-xs sm:text-sm">{totalYearActivities.length}</Badge>
                     </div>
                     
                     {/* Ukupni sati - prikazuju se samo ako ima dovršenih aktivnosti */}
                     {yearHours > 0 && (
                       <div className="flex justify-between text-muted-foreground w-full">
                         <div className="flex items-center gap-1 sm:gap-1.5">
                           <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                           <span className="text-xs sm:text-sm">{t('list.totalHoursLabel')}</span>
                         </div>
                         <Badge variant="outline" className="text-xs sm:text-sm">{formatHoursToHHMM(yearHours)} h</Badge>
                       </div>
                     )}
                   </CardFooter>
                </Card>
              </Link>
            );
          })
        ) : (
          <div className="col-span-full flex items-center justify-center h-40 text-gray-500">
            <div className="text-center">
              <Calendar className="h-12 w-12 mx-auto mb-2" />
              <p>{t('list.noActivities')}</p>
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