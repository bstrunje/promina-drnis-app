import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getActivityById, cancelActivity as apiCancelActivity } from '../../utils/api/apiActivities';
import { Activity } from '@shared/activity.types';
import { useAuth } from '../../context/AuthContext';
import { format, differenceInHours, differenceInMinutes } from 'date-fns';
import { ArrowLeft, Calendar, User, Edit, Users, Info, Ban } from 'lucide-react';
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

const ActivityDetailPage: React.FC = () => {
  const { activityId } = useParams<{ activityId: string }>();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

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

  if (loading) return <div className="text-center p-4">Učitavanje...</div>;
  if (error) return <div className="text-center p-4 text-red-500">{error}</div>;
  if (!activity) return <div className="text-center p-4">Aktivnost nije pronađena.</div>;

  const canEdit = user?.role === 'member_superuser' || user?.member_id === activity.organizer?.member_id;
  const isCancelled = activity.status === 'CANCELLED';
  const isCompleted = activity.status === 'COMPLETED';
  
  // Provjera je li aktivnost tipa SASTANCI prema ključu (key) - stabilniji identifikator
  const isMeetingType = activity.activity_type?.key === 'sastanci';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PLANNED':
        return <Badge variant="default">Planirano</Badge>;
      case 'ACTIVE':
        return <Badge variant="secondary">Aktivno</Badge>;
      case 'COMPLETED':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Završeno</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Otkazano</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const totalMinutes =
    activity.actual_start_time && activity.actual_end_time
      ? differenceInMinutes(new Date(activity.actual_end_time), new Date(activity.actual_start_time))
      : 0;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return (
    <div className="container mx-auto p-4">
      <Button onClick={() => navigate(-1)} variant="ghost" className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Povratak
      </Button>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl mb-2">{activity.name}</CardTitle>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                {getStatusBadge(activity.status)}
                
                {/* Prikaz ručnog unosa ili trajanja aktivnosti u plavoj oznaci */}
                {isCompleted && (
                  <Badge variant="default" className="bg-blue-500 text-white">
                    {activity.participants && activity.participants.some(p => p.manual_hours)
                      ? (() => {
                          // Izračunaj ukupne sate iz ručnog unosa prvog sudionika
                          const firstParticipantWithManualHours = activity.participants?.find(p => p.manual_hours);
                          if (firstParticipantWithManualHours?.manual_hours) {
                            const hours = Math.floor(firstParticipantWithManualHours.manual_hours);
                            const minutes = Math.round((firstParticipantWithManualHours.manual_hours - hours) * 60);
                            return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
                          }
                          return '0h 00m';
                        })()
                      : totalMinutes > 0
                        ? (() => {
                            const hours = Math.floor(totalMinutes / 60);
                            const minutes = totalMinutes % 60;
                            return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
                          })()
                        : null}
                  </Badge>
                )}
              </div>
            </div>
            {canEdit && !isCancelled && (
              <div className="flex space-x-2">
                <Link to={`/activities/${activity.activity_id}/edit`}>
                  <Button variant="outline">
                    <Edit className="mr-2 h-4 w-4" /> Uredi
                  </Button>
                </Link>
                {!isCompleted && (
                  <Button variant="destructive" onClick={() => setIsCancelModalOpen(true)}>
                    <Ban className="mr-2 h-4 w-4" /> Otkaži
                  </Button>
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
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start">
                <Info className="h-5 w-5 mr-3 mt-1 text-gray-500" />
                <div>
                  <h3 className="font-semibold">Opis</h3>
                  <p className="text-gray-600">{activity.description}</p>
                </div>
              </div>

              <div className="flex items-start">
                <Calendar className="h-5 w-5 mr-3 mt-1 text-gray-500" />
                <div>
                  <h3 className="font-semibold">Vrijeme održavanja</h3>
                  
                  {/* Provjera ima li ručnog unosa sati */}
                  {activity.participants && activity.participants.some(p => p.manual_hours) ? (
                    <p className="text-gray-600">
                      <span className="font-medium">Ručni unos</span>
                    </p>
                  ) : (
                    <>
                      <p className="text-gray-600">
                        Početak:{' '}
                        {activity.actual_start_time
                          ? format(new Date(activity.actual_start_time), 'dd.MM.yyyy HH:mm')
                          : 'Nije definirano'}
                      </p>
                      <p className="text-gray-600">
                        Završetak:{' '}
                        {activity.actual_end_time
                          ? format(new Date(activity.actual_end_time), 'dd.MM.yyyy HH:mm')
                          : 'Nije definirano'}
                      </p>
                    </>
                  )}
                  
                  {/* Prikaz postotka priznavanja sati samo ako nije tip SASTANCI ili ako je postotak različit od 100% */}
                  {(!isMeetingType || (activity.recognition_percentage && activity.recognition_percentage < 100)) && (
                    <div className="mt-2 border-t border-gray-100 pt-2">
                      <p className="text-gray-600">
                        <span className="font-medium">Postotak priznavanja sati:</span>{' '}
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
                  <User className="h-5 w-5 mr-3 mt-1 text-gray-500" />
                  <div>
                    <h3 className="font-semibold">Organizator</h3>
                    <p className="text-gray-600">{activity.organizer?.full_name || 'N/A'}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start">
                <Users className="h-5 w-5 mr-3 mt-1 text-gray-500" />
                <div>
                  <h3 className="font-semibold">Sudionici ({activity.participants?.length || 0})</h3>
                  {activity.participants && activity.participants.length > 0 ? (
                    <ul className="list-disc list-outside ml-5 text-gray-600">
                      {activity.participants.map((p) => (
                        <li key={p.member.member_id}>
                          <div className="flex flex-col">
                            <div>
                              {p.member.full_name}
                              {/* Za SASTANCI, prikazujemo postotak u zagradi samo ako je različit od 100% */}
                              {isMeetingType && p.recognition_override && p.recognition_override !== 100 && (
                                <span className="text-amber-600 font-medium ml-1">({p.recognition_override}%)</span>
                              )}
                            </div>
                            {/* Za ostale tipove aktivnosti, prikazujemo postotak u novom redu ako je različit od activity.recognition_percentage */}
                            {!isMeetingType && p.recognition_override && p.recognition_override !== activity.recognition_percentage && (
                              <div className="text-sm text-amber-600 font-medium">
                                Postotak priznavanja: {p.recognition_override}%
                              </div>
                            )}
                            {/* Uklonjen prikaz ručnog unosa sati kod sudionika */}
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
