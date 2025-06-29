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
                {isCompleted && totalMinutes > 0 && (
                  <Badge variant="default" className="bg-blue-500 text-white">{`${hours}h ${minutes}min`}</Badge>
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
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start">
                <User className="h-5 w-5 mr-3 mt-1 text-gray-500" />
                <div>
                  <h3 className="font-semibold">Organizator</h3>
                  <p className="text-gray-600">{activity.organizer?.full_name || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-start">
                <Users className="h-5 w-5 mr-3 mt-1 text-gray-500" />
                <div>
                  <h3 className="font-semibold">Sudionici ({activity.participants?.length || 0})</h3>
                  {activity.participants && activity.participants.length > 0 ? (
                    <ul className="list-disc list-inside text-gray-600">
                      {activity.participants.map((p) => (
                        <li key={p.member.member_id}>{p.member.full_name}</li>
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
