import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './activities.css';
import { useParams, Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { getActivityById, cancelActivity as apiCancelActivity, joinActivity } from '../../utils/api/apiActivities';
import { Activity } from '@shared/activity.types';
import { useAuth } from '../../context/AuthContext';
import { format, differenceInHours, differenceInMinutes } from 'date-fns';
import { formatHoursToHHMM, calculateActivityHours } from '@/utils/activityHours';
import { ArrowLeft, Calendar, User, Edit, Users, Info, Ban, AlertCircle, CheckCircle2, PlayCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';
import { Textarea } from '@components/ui/textarea';
import { toast } from 'sonner';
import { ParticipantRole, rolesToRecognitionPercentage } from './MemberRoleSelect';

const getRoleLabels = (t: any): { [key in ParticipantRole]: string } => ({
  [ParticipantRole.GUIDE]: t('activities.roles.guide'),
  [ParticipantRole.ASSISTANT_GUIDE]: t('activities.roles.assistantGuide'),
  [ParticipantRole.DRIVER]: t('activities.roles.driver'),
  [ParticipantRole.REGULAR]: t('activities.roles.regular'),
});

// Funkcija za dobivanje naziva uloge na temelju postotka priznavanja
const getRoleNameByPercentage = (percentage: number, t: any): string | null => {
  const roleEntry = Object.entries(rolesToRecognitionPercentage).find(([, value]) => value === percentage);
  if (roleEntry) {
    const roleLabels = getRoleLabels(t);
    return roleLabels[roleEntry[0] as ParticipantRole];
  }
  return null; // Vraća null ako nema definirane uloge
};



const ActivityDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { activityId } = useParams<{ activityId: string }>();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Provjeravamo dolazimo li iz prikaza po godini
  const yearParam = searchParams.get('year') || '';

  const fetchActivity = async () => {
    if (!activityId) return;
    try {
      setLoading(true);
      const data = await getActivityById(activityId);
      setActivity(data);
    } catch (err) {
      setError('Greška pri dohvaćanju detalja aktivnosti.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, [activityId]);

  const handleCancelConfirm = async () => {
    if (!activityId || !cancellationReason) {
      toast.error('Razlog otkazivanja je obavezan.');
      return;
    }
    if (!activity) return;

    try {
      await apiCancelActivity(activity.activity_id, cancellationReason);
      toast.success('Aktivnost je uspješno otkazana.');
      setIsCancelModalOpen(false);
      setCancellationReason('');
      fetchActivity(); // Ponovno dohvati podatke da se osvježi status
    } catch (error) {
      toast.error('Došlo je do greške prilikom otkazivanja aktivnosti.');
      console.error(error);
    }
  };

  const handleJoinActivity = async () => {
    if (!activityId) return;
    try {
      await joinActivity(parseInt(activityId, 10));
      toast.success('Uspješno ste se prijavili za aktivnost!');
      fetchActivity(); // Osvježi podatke da se prikaže novi sudionik
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Došlo je do greške prilikom prijave.';
      toast.error(errorMessage);
      console.error(error);
    }
  };

  if (loading) return <div className="text-center p-4">Učitavanje...</div>;
  if (error) return <div className="text-center p-4 text-red-500">{error}</div>;
  if (!activity) return <div className="text-center p-4">Aktivnost nije pronađena.</div>;

  const canEdit = user?.role === 'member_superuser' || user?.member_id === activity.organizer?.member_id;
  const isParticipant = activity.participants?.some(p => p.member_id === user?.member_id);
  const canJoin = activity.status === 'PLANNED' && !isParticipant && user;
  const isCancelled = activity.status === 'CANCELLED';
  const isCompleted = activity.status === 'COMPLETED';


  
  // Provjera je li aktivnost tipa SASTANCI ili IZLETI prema ključu (key) - stabilniji identifikator
  const isMeetingType = activity.activity_type?.key === 'sastanci';
  const isExcursionType = activity.activity_type?.key === 'izleti';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PLANNED':
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            Planirana
          </Badge>
        );
      case 'ACTIVE':
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-blue-600">
            <PlayCircle className="h-3.5 w-3.5" />
            U tijeku
          </Badge>
        );
      case 'COMPLETED':
        return (
          <Badge variant="secondary" className="flex items-center gap-1 bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Završena
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" />
            Otkazana
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };



  return (
    <div className="container mx-auto p-3 sm:p-4">
      {activity && (
        <Button 
          asChild 
          variant="ghost" 
          className="mb-4"
        >
          {yearParam ? (
            // Ako imamo parametar godine, vodimo na pregled kategorija za tu godinu
            <Link to={activity.type_id 
              ? `/activities/category/${activity.type_id}?year=${yearParam}` 
              : `/activities/year/${yearParam}`}>
              <ArrowLeft className="mr-2 h-4 w-4" /> 
              {activity.type_id ? 'Natrag na kategoriju' : 'Natrag na kategorije'}
            </Link>
          ) : (
            // Ako nemamo parametar godine, standardni povratak na kategoriju
            <Link to={activity.type_id ? `/activities/category/${activity.type_id}` : "/activities"}>
              <ArrowLeft className="mr-2 h-4 w-4" /> 
              {activity.type_id ? 'Sve kategorije' : 'Natrag'}
            </Link>
          )}
        </Button>
      )}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>

              
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                {getStatusBadge(activity.status)}
                {isCompleted && calculateActivityHours(activity) > 0 && (
                  <Badge variant="default" className="bg-blue-500 text-white font-mono text-sm">
                    {formatHoursToHHMM(calculateActivityHours(activity))}
                  </Badge>
                )}
              </div>
            </div>
            {(canJoin || (canEdit && !isCancelled)) && (
              <div className="flex flex-wrap items-start gap-2 mt-2 sm:mt-0">
                {canJoin && (
                  <Button onClick={handleJoinActivity} className="bg-primary hover:bg-primary/90 text-white">
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Pridruži se
                  </Button>
                )}
                {canEdit && !isCancelled && (
                  <>
                    <Link to={`/activities/${activity.activity_id}/edit`}>
                      <Button variant="outline" size="sm" className="sm:size-md w-full sm:w-auto">
                        <Edit className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> 
                        <span className="text-xs sm:text-sm">Uredi</span>
                      </Button>
                    </Link>
                    {!isCompleted && (
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="sm:size-md w-full sm:w-auto"
                        onClick={() => setIsCancelModalOpen(true)}
                      >
                        <Ban className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> 
                        <span className="text-xs sm:text-sm">Otkaži</span>
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isCancelled && activity.cancellation_reason && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <h3 className="font-semibold text-red-800">Razlog otkazivanja:</h3>
              <p className="text-red-700">{activity.cancellation_reason}</p>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-4">
              <div className="flex items-start">
                <Info className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 mt-1 text-gray-500" />
                <div>
                  <h3 className="font-semibold text-sm sm:text-base">Opis</h3>
                  <p className="text-gray-600 text-sm sm:text-base">{activity.description}</p>
                </div>
              </div>

              <div className="flex items-start">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 mt-1 text-gray-500" />
                <div>
                  <h3 className="font-semibold text-sm sm:text-base">Vrijeme održavanja</h3>
                  
                  {/* Provjera ima li ručnog unosa sati */}
                  {activity.participants && activity.participants.some(p => p.manual_hours) ? (
                    <p className="text-gray-600 text-sm sm:text-base">
                      <span className="font-medium">Ručni unos</span>
                    </p>
                  ) : (
                    <>
                      <p className="text-gray-600 text-sm sm:text-base">
                        <span className="hidden sm:inline">Početak:{' '}</span>
                        <span className="inline sm:hidden">Od:{' '}</span>
                        {activity.actual_start_time
                          ? format(new Date(activity.actual_start_time), 'dd.MM.yyyy HH:mm')
                          : 'Nije definirano'}
                      </p>
                      <p className="text-gray-600 text-sm sm:text-base">
                        <span className="hidden sm:inline">Završetak:{' '}</span>
                        <span className="inline sm:hidden">Do:{' '}</span>
                        {activity.actual_end_time
                          ? format(new Date(activity.actual_end_time), 'dd.MM.yyyy HH:mm')
                          : 'Nije definirano'}
                      </p>
                    </>
                  )}
                  
                  {/* Prikaz postotka priznavanja sati samo ako nije tip SASTANCI ili ako je postotak različit od 100% */}
                  {(!isMeetingType || (activity.recognition_percentage && activity.recognition_percentage < 100)) && (
                    <div className="mt-2 border-t border-gray-100 pt-2">
                      <p className="text-gray-600 text-sm sm:text-base">
                        <span className="font-medium">Postotak priznavanja:</span>{' '}
                        <span className={activity.recognition_percentage < 100 ? 'text-amber-600 font-semibold' : ''}>
                          {activity.recognition_percentage || 100}%
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Prikaz organizatora samo ako nije tip SASTANCI */}
              {!isMeetingType && (
                <div className="flex items-start">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 mt-1 text-gray-500" />
                  <div>
                    <h3 className="font-semibold text-sm sm:text-base">Organizator</h3>
                    <p className="text-gray-600 text-sm sm:text-base">{activity.organizer?.full_name || 'N/A'}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 mt-1 text-gray-500" />
                <div>
                  <h3 className="font-semibold text-sm sm:text-base">Sudionici ({activity.participants?.length || 0})</h3>
                  {activity.participants && activity.participants.length > 0 ? (
                    <ul className="list-disc list-outside ml-5 text-gray-600 text-xs sm:text-sm space-y-1">
                      {activity.participants.map((p) => (
                        <li key={p.member.member_id}>
                          {p.member.full_name}
                          {/* Prikaz uloge samo za izlete */}
                          {activity?.activity_type?.key === 'izleti' && p.recognition_override !== null && p.recognition_override !== undefined && (() => {
                            const roleName = getRoleNameByPercentage(p.recognition_override, t);
                            return roleName ? (
                              <Badge variant="outline" className="ml-2 border-amber-300 text-amber-700 bg-amber-50 text-xs">
                                {roleName}
                              </Badge>
                            ) : null;
                          })()}
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <Clock className="h-3 w-3 mr-1" />
                            <span>Priznato: {formatHoursToHHMM(p.recognized_hours)}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>Nema prijavljenih sudionika.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Otkazivanje aktivnosti</DialogTitle>
            <DialogDescription>Molimo unesite razlog otkazivanja aktivnosti. Ova akcija je nepovratna.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Unesite razlog otkazivanja..."
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCancelModalOpen(false)}>
              Odustani
            </Button>
            <Button variant="destructive" onClick={handleCancelConfirm}>
              Potvrdi otkazivanje
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ActivityDetailPage;
