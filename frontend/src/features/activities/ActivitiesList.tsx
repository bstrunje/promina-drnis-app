import React, { useState, useEffect, useCallback } from 'react';
import './activities.css';
import { TenantLink } from '../../components/TenantLink';
import { Card, CardHeader, CardTitle } from '@components/ui/card';
import { Alert, AlertDescription } from '@components/ui/alert';
import { getActivityTypes, getAllActivitiesWithParticipants } from '@/utils/api/apiActivities';
import { ActivityType, Activity, ActivityStatus } from '@shared/activity.types';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Calendar, PlusCircle } from 'lucide-react';
import { calculateGrandTotalHours, formatHoursToHHMM } from '@/utils/activityHours';
import { usePermissions } from '../../hooks/usePermissions';
import { useTranslation } from 'react-i18next';
import CreateActivityModal from './CreateActivityModal';
import { useBranding } from '../../hooks/useBranding';

// Napomena: uklonjen useAuth jer user nije korišten u ovoj komponenti
// import { useAuth } from '@/context/useAuth';

const ActivitiesList: React.FC = () => {
  const { t } = useTranslation('activities');
  const { getPrimaryColor } = useBranding();
  // const { user } = useAuth();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Dodajemo stanje za godine koje će biti prikazane
  const [activityYears, setActivityYears] = useState<number[]>([]);
  // Dodajemo stanje za modalni prozor za kreiranje aktivnosti
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);

  // Provjeri ima li korisnik dozvole za upravljanje aktivnostima
  const canCreateActivities = hasPermission('can_create_activities');
  // Napomena: uklonjena varijabla hasActivityPermissions jer se ne koristi
  // const hasActivityPermissions = canViewActivities || canCreateActivities || canApproveActivities;

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
    } catch {
      // Tihi fallback bez console logova radi ESLint pravila
      setError(t('list.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Učitavanje dostupnih godina kada se učitaju aktivnosti
  useEffect(() => {
    if (allActivities.length > 0) {
      // Izdvajamo jedinstvene godine iz svih aktivnosti
      const years = allActivities.map(activity => {
        // Provjera ima li aktivnost datum početka
        if (!activity.start_date) {
          return new Date().getFullYear(); // Defaultno trenutna godina
        }
        
        // Izvlačimo godinu iz ISO formata ili direktno iz datuma
        let year: number;
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
  const completedActivities = allActivities.filter(activity => activity.status === ActivityStatus.COMPLETED);
  
  // Direktno računamo ukupne sate svih aktivnosti, uključujući sve sudionike
  const totalCompletedHours = calculateGrandTotalHours(completedActivities);
  
  // Računamo sate po godini za prikaz u karticama
  const yearHoursMap: Record<number, number> = {};
  activityYears.forEach(year => {
    const yearActivities = completedActivities.filter(activity => {
      const activityYear: number = new Date(activity.start_date).getFullYear();
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

  // Ako se još učitavaju dozvole, prikaži loading
  if (permissionsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Učitavanje...</div>
      </div>
    );
  }

  if (loading) return <div className="p-6">{t('list.loading')}</div>;
  if (error) return (
    <div className="p-6">
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">{t('list.title')}</h1>
        <div className="flex items-center gap-4">
          <p className="text-muted-foreground hidden md:block">{t('list.description')}</p>
          {canCreateActivities && (
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

      <div className="space-y-4">
        {activityYears.length > 0 ? (
          activityYears.map((year) => {
            // Računamo ukupne sate za aktivnosti ove godine (samo COMPLETED aktivnosti računamo u sate)
            const yearActivities = allActivities.filter(activity => {
              // Provjera ima li aktivnost datum početka
              if (!activity.start_date) return false;
              
              // Izvlačimo godinu iz ISO formata ili direktno iz datuma
              let activityYear: number;
              if (typeof activity.start_date === 'string') {
                // Ako je string, izvlačimo godinu iz ISO string formata (yyyy-mm-dd...)
                activityYear = parseInt(activity.start_date.substring(0, 4), 10);
              } else {
                // Ako je Date objekt
                const date = new Date(activity.start_date);
                activityYear = date.getFullYear();
              }
              
              return activityYear === year && activity.status === ActivityStatus.COMPLETED;
            });
            
            // Računamo ukupni broj aktivnosti u toj godini (sve aktivnosti, bez obzira na status)
            const totalYearActivities = allActivities.filter(activity => {
              // Provjera ima li aktivnost datum početka
              if (!activity.start_date) return false;
              
              // Izvlačimo godinu iz ISO formata ili direktno iz datuma
              let activityYear: number;
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

            // Provjera za aktivne, najavljene i otkazane aktivnosti unutar godine
            const hasActive = totalYearActivities.some(a => a.status === ActivityStatus.ACTIVE);
            const hasPlanned = totalYearActivities.some(a => a.status === ActivityStatus.PLANNED);
            const hasCancelled = totalYearActivities.some(a => a.status === ActivityStatus.CANCELLED);
            
            // Link bi vodio na posebnu stranicu za pregled aktivnosti po godini
            // Trenutno vodimo na istu stranicu, ali ovo bi se trebalo kasnije prilagoditi
            return (
              <TenantLink to={`/activities/year/${year}`} key={year}>
                <Card className="hover:bg-muted/50 transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between py-4 space-y-0">
                    <div className="flex items-center gap-3 flex-1">
                      <Calendar className="h-6 w-6 text-primary flex-shrink-0" />
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1">{year}.</CardTitle>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <span>{t('list.activities')}:</span>
                            <span className="font-medium">{totalYearActivities.length}</span>
                          </div>
                          {yearHours > 0 && (
                            <div className="flex items-center gap-1">
                              <span>{t('list.totalHoursLabel')}:</span>
                              <span className="font-medium">{formatHoursToHHMM(yearHours)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasActive && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getPrimaryColor() }} title={t('list.tooltips.activeActivities')}></div>}
                      {hasPlanned && <div className="w-3 h-3 bg-green-600 rounded-full" title={t('list.tooltips.plannedActivities')}></div>}
                      {hasCancelled && <div className="w-3 h-3 bg-red-600 rounded-full" title={t('list.tooltips.cancelledActivities')}></div>}
                      <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </CardHeader>
                </Card>
              </TenantLink>
            );
          })
        ) : (
          <div className="flex items-center justify-center h-40 text-gray-500">
            <div className="text-center">
              <Calendar className="h-12 w-12 mx-auto mb-2" />
              <p>{t('list.noActivities')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal za kreiranje aktivnosti */}
      {canCreateActivities && (
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