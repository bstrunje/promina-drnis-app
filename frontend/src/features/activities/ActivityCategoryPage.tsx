import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Activity as ActivityIcon, ArrowLeft, Calendar, Clock, MapPin, PlusCircle, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@components/ui/alert';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { getActivityTypes, getActivitiesByTypeId, deleteActivity } from '@/utils/api/apiActivities';
import { Activity, ActivityType, ActivityStatus } from '@shared/activity.types';
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import CreateActivityModal from './CreateActivityModal';
import { Badge } from '@components/ui/badge';
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
  const { type_id: activityTypeId } = useParams<{ type_id: string }>();
  const [activityType, setActivityType] = useState<ActivityType | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Funkcija za formatiranje decimalnih sati u format hh:mm
  const formatHoursToHHMM = (decimalHours: number): string => {
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
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
            <Badge variant="secondary" className="text-lg">{formatHoursToHHMM(totalCompletedHours)} h</Badge>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {activities.length > 0 ? (
          activities.map(activity => {
            return (
              <div key={activity.activity_id} className="relative">
                <Link to={`/activities/${activity.activity_id}`} className="block">
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
                          Obriši aktivnost
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

      {/* Dialog za potvrdu brisanja aktivnosti */}
      {user?.role === 'member_superuser' && (
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Potvrda brisanja</DialogTitle>
              <DialogDescription>
                Jeste li sigurni da želite obrisati aktivnost "{activityToDelete?.name}"?
                Ova akcija će obrisati sve podatke povezane s aktivnošću i ne može se poništiti.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={handleDeleteCancel}
                disabled={isDeleting}
              >
                Odustani
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? "Brisanje..." : "Obriši"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ActivityCategoryPage;