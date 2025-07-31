import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import './activities.css'; // Dodajemo CSS za custom stilove
import { useParams, Link, useLocation, useSearchParams } from 'react-router-dom';
import { Activity as ActivityIcon, ArrowLeft, Calendar, Clock, MapPin, PlusCircle, Trash2, MountainSnow, Users, ClipboardList, ListChecks, Axe, Route, ConciergeBell } from 'lucide-react';
import { Alert, AlertDescription } from '@components/ui/alert';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { getActivityTypes, getActivitiesByTypeId, deleteActivity, getAllActivities, getActivitiesByYearWithParticipants } from '@/utils/api/apiActivities';
import { Activity, ActivityType, ActivityStatus } from '@shared/activity.types';
import { format, parseISO } from 'date-fns';
import { hr, enUS } from 'date-fns/locale';
import { useAuth } from '@/context/AuthContext';
import CreateActivityModal from './CreateActivityModal';
import { Badge } from '@components/ui/badge';
import { calculateActivityHours, calculateGrandTotalHours, formatHoursToHHMM } from '@/utils/activityHours';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';
import { toast } from 'sonner';

const ActivityCategoryPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const currentLocale = i18n.language === 'hr' ? hr : enUS;
  // Dohvaćamo parametre iz URL-a i trenutnu lokaciju
  const { type_id: activityTypeId, year: yearUrlParam } = useParams<{ type_id?: string; year?: string }>();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // Dohvat godine iz URL parametra ili query stringa
  const yearQueryParam = searchParams.get('year');
  const yearParam = yearUrlParam || yearQueryParam;
  
  // Određujemo način prikaza na temelju URL-a (po kategoriji ili po godini)
  const isYearView = location.pathname.includes('/activities/year/');
  
  const [activityType, setActivityType] = useState<ActivityType | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Pretvaramo year parametar u broj
  const year = yearParam ? parseInt(yearParam, 10) : null;

  const iconMap: { [key: string]: React.ElementType } = {
    'akcija-drustvo': Axe,
    'akcija-trail': Route,
    dezurstva: ConciergeBell,
    izleti: MountainSnow,
    sastanci: Users,
    razno: ClipboardList,
    default: ActivityIcon,
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Uvijek dohvaćamo tipove aktivnosti
      const types = await getActivityTypes();
      setActivityTypes(types);
      
      // Način dohvata ovisi o tome prikazujemo li po kategoriji ili po godini
      if (isYearView && yearParam) {
        // U prikazu po godini, želimo prikazati kategorije a ne aktivnosti
        // Tako da trebamo samo tipove koje već imamo
        
        // Dohvaćamo aktivnosti te godine za računanje statistike s detaljima o sudionicima
        // Koristimo novu funkciju koja dohvaća sve podatke o sudionicima za pravilni izračun sati
        const year = parseInt(yearParam, 10);
        const activitiesForYear = await getActivitiesByYearWithParticipants(year);
        setActivities(activitiesForYear);
        setActivityType(null); // Nema specifičnog tipa aktivnosti u prikazu po godini
        
      } else if (isYearView && activityTypeId && yearParam) {
        // Prikaz aktivnosti za određeni tip unutar godine
        const currentType = types.find(t => t.type_id.toString() === activityTypeId);
        setActivityType(currentType || null);
        
        const year = parseInt(yearParam, 10);
        const activitiesForTypeInYear = await getActivitiesByTypeId(activityTypeId, year);
        setActivities(activitiesForTypeInYear);
        
      } else if (activityTypeId) {
        // Standardni dohvat po kategoriji (bez filtriranja po godini)
        const currentType = types.find(t => t.type_id.toString() === activityTypeId);
        setActivityType(currentType || null);

        if (currentType) {
          const activitiesData = await getActivitiesByTypeId(activityTypeId, year || undefined);
          setActivities(activitiesData);
        }
      }
      
      setError(null);
    } catch (err) {
      console.error('Greška prilikom dohvaćanja podataka:', err);
      setError('Došlo je do pogreške prilikom dohvaćanja podataka.');
    } finally {
      setLoading(false);
    }
  }, [isYearView, activityTypeId, yearParam]);

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityTypeId, yearParam, isYearView]);

  const handleActivityCreated = () => {
    setCreateModalOpen(false);
    void fetchData();
  };

  const handleDeleteClick = (activity: Activity, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActivityToDelete(activity);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!activityToDelete) return;
    
    try {
      setIsDeleting(true);
      await deleteActivity(activityToDelete.activity_id);
      toast.success('Aktivnost je uspješno obrisana');
      void fetchData(); // Ponovno učitaj aktivnosti
    } catch (error) {
      console.error('Greška prilikom brisanja aktivnosti:', error);
      toast.error('Došlo je do pogreške prilikom brisanja aktivnosti');
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setActivityToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteDialogOpen(false);
    setActivityToDelete(null);
  };

  // Formatiranje sati u oblik hh:mm za prikaz u UI
  const formatDuration = (hours: number): string => {
    const hoursInt = Math.floor(hours);
    const minutesInt = Math.round((hours - hoursInt) * 60);
    return `${hoursInt}h ${minutesInt.toString().padStart(2, '0')}m`;
  };

  // Računamo ukupne sate za kategoriju, uključujući sate svih sudionika
  const totalCompletedHours = calculateGrandTotalHours(
    activities.filter(activity => activity.status === 'COMPLETED')
  );

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
          <Link to={yearParam && !isYearView ? `/activities/year/${yearParam}` : "/activities"}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {isYearView ? t('activities.summary.allYears') : (yearParam ? t('activities.summary.activitiesInYear', { year: yearParam }) : t('activities.summary.allCategories'))}
          </Link>
        </Button>
        <div className="flex justify-between items-center">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            {isYearView ? (
              <>
                <Calendar className="h-6 w-6 sm:h-8 sm:w-8" />
                <span className="text-xl sm:text-3xl">{t('activities.summary.yearActivitiesTitle', { year: yearParam })}</span>
              </>
            ) : (
              <>
                {React.createElement(iconMap[activityType?.key ?? 'default'] || iconMap.default, { className: 'h-8 w-8' })}
                {activityType?.name || 'Aktivnosti'}
              </>
            )}
          </h1>
          {(user?.role === 'member_administrator' || user?.role === 'member_superuser') && (
            <Button onClick={() => setCreateModalOpen(true)} size="sm" className="sm:text-base sm:px-4 sm:py-2">
              <PlusCircle className="mr-1 sm:mr-2 h-4 w-4" />
              <span>{t('activitiesList.create')}</span>
            </Button>
          )}
        </div>
        {!isYearView && <p className="text-sm text-muted-foreground pt-1">{t(`activities.descriptions.${activityType?.key}`)}</p>}
      </div>

      <div className="mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              <span className="hidden sm:inline">
                {isYearView 
                  ? t('activities.totalHoursInYear', { year: yearParam }) 
                  : t('activities.totalHoursInCategory')}
              </span>
              <span className="inline sm:hidden">
                {isYearView 
                  ? t('activities.hoursInYear', { year: yearParam }) 
                  : t('activities.hoursInCategory')}
              </span>
            </CardTitle>
            <Badge variant="secondary" className="text-lg">{formatHoursToHHMM(totalCompletedHours)} h</Badge>
          </CardHeader>
        </Card>
      </div>

      {isYearView && !activityTypeId ? (
        // Prikaz kategorija kada gledamo po godini
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {activityTypes.length > 0 ? (
            activityTypes.map(type => {
              // Za svaki tip aktivnosti, filtriraj aktivnosti te godine koje pripadaju tom tipu
              const activitiesForType = activities.filter(activity => 
                activity.type_id === type.type_id
              );
              
              // Računamo sate za ovaj tip aktivnosti u odabranoj godini
              const typeHours = calculateGrandTotalHours(
                activitiesForType.filter(activity => activity.status === 'COMPLETED')
              );
              
              // Ukupan broj aktivnosti u ovoj kategoriji
              const totalActivitiesCount = activitiesForType.length;

              // Provjera za aktivne i najavljene aktivnosti
              const hasActive = activitiesForType.some(a => a.status === 'ACTIVE');
              const hasPlanned = activitiesForType.some(a => a.status === 'PLANNED');
              
              return (
                <Link 
                  to={`/activities/category/${type.type_id}${yearParam ? `?year=${yearParam}` : ''}`} 
                  key={type.type_id}
                  className="block"
                >
                  <Card className="h-full transition-colors hover:bg-muted/50 activity-card">
                    <CardHeader className="activity-card-header">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          {React.createElement(iconMap[type.key] || iconMap.default, { className: 'h-6 w-6 text-primary' })}
                          <CardTitle className="text-base sm:text-lg">{t(`activities.types.${type.key}`).toUpperCase()}</CardTitle>
                        </div>
                        <div className="flex items-center gap-1">
                          {hasActive && <div className="w-3 h-3 bg-blue-500 rounded-full" title="Postoje aktivne aktivnosti"></div>}
                          {hasPlanned && <div className="w-3 h-3 bg-green-600 rounded-full" title="Postoje najavljene aktivnosti"></div>}
                        </div>
                      </div>
                      {type.description && (
                        <p className="text-sm text-muted-foreground mt-1 mb-0 hidden md:block">{t(`activities.descriptions.${type.key}`)}</p>
                      )}
                    </CardHeader>
                    <CardFooter className="pt-2 flex flex-col gap-2 activity-card-footer">
                      <div className="w-full space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1 text-xs sm:text-sm">
                            <ListChecks className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{t('activities.summary.total')}</span>
                          </div>
                          <Badge variant="secondary">{totalActivitiesCount}</Badge>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1 text-xs sm:text-sm">
                            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{t('activities.summary.hours')}</span>
                          </div>
                          <Badge variant="outline">{formatHoursToHHMM(typeHours)} h</Badge>
                        </div>
                      </div>
                    </CardFooter>
                  </Card>
                </Link>
              );
            })
          ) : (
            <div className="col-span-full text-center text-muted-foreground">
              <p>Učitavanje kategorija aktivnosti...</p>
            </div>
          )}
          
          {activityTypes.length > 0 && activities.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground">
              <p>Nema aktivnosti u {yearParam}. godini.</p>
            </div>
          )}
        </div>
      ) : (
        // Prikaz aktivnosti (standard ili filtrirano po godini i tipu)
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {activities.length > 0 ? (
            activities.map(activity => {
              return (
                <div key={activity.activity_id} className="relative">
                  <Link to={`/activities/${activity.activity_id}${yearParam ? `?year=${yearParam}` : ''}`} className="block">
                    <Card className="h-full transition-colors hover:bg-muted/50">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle>{activity.name}</CardTitle>
                          {activity.status === 'COMPLETED' && (
                            <Badge variant="outline">
                              {formatDuration(calculateActivityHours(activity))}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{format(new Date(activity.start_date), 'P', { locale: currentLocale })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{format(new Date(activity.start_date), 'HH:mm')}</span>
                        </div>
                        <div className="pt-2 text-right">
                          {(() => {
                            const statusKey = `activities.status.${activity.status.toLowerCase()}`;
                            const statusText = t(statusKey);
                            switch (activity.status) {
                              case 'PLANNED':
                                return <span className="font-semibold text-green-600">{statusText}</span>;
                              case 'ACTIVE':
                                return <span className="font-semibold text-blue-500">{statusText}</span>;
                              case 'COMPLETED':
                                return <span className="font-semibold text-black">{statusText}</span>;
                              case 'CANCELLED':
                                return <span className="font-semibold text-red-500">{statusText}</span>;
                              default:
                                return null;
                            }
                          })()}
                        </div>
                      </CardContent>
                      
                      {/* Gumb za brisanje aktivnosti - vidljiv samo superuserima */}
                      {user?.role === 'member_superuser' && (
                        <CardFooter className="pt-0">
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="w-full" 
                            onClick={(e) => handleDeleteClick(activity, e)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t('activities.deleteActivity')}
                          </Button>
                        </CardFooter>
                      )}
                    </Card>
                  </Link>
                </div>
              );
            })
          ) : (
            <div className="col-span-full text-center text-muted-foreground">
              <p>{t('activities.noActivitiesInCategory')}</p>
            </div>
          )}
        </div>
      )}

      {(user?.role === 'member_administrator' || user?.role === 'member_superuser') && (
        <CreateActivityModal
          isOpen={isCreateModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onActivityCreated={handleActivityCreated}
          activityTypeId={activityTypeId || null}
        />
      )}

      {/* Dialog za potvrdu brisanja aktivnosti */}
      {user?.role === 'member_superuser' && (
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('activities.confirmDeletion')}</DialogTitle>
              <DialogDescription>
                {t('activities.deleteConfirmationMessage', { name: activityToDelete?.name })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={handleDeleteCancel}
                disabled={isDeleting}
              >
                {t('common.cancel')}
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? t('activities.deleting') : t('activities.delete')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ActivityCategoryPage;