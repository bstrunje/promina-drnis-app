import React, { useEffect, useState } from 'react';
const isDev = import.meta.env.DEV;
import { useTranslation } from 'react-i18next';
import type { TFunction, i18n as I18n } from 'i18next';
import './activities.css';
import { useParams, useSearchParams } from 'react-router-dom';
import { TenantLink } from '../../components/TenantLink';
import { getActivityById, cancelActivity as apiCancelActivity, joinActivity, leaveActivity } from '../../utils/api/apiActivities';
import { Activity, ActivityStatus } from '@shared/activity.types';
import { useAuth } from '../../context/useAuth';
import { format } from 'date-fns';
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
import { ParticipantRole } from '@shared/activity.types';
import { useBranding } from '../../hooks/useBranding';

// Mapiraj oznake uloga; tipizirano bez 'any'
// Napomena: eksplicitno navodimo namespace 'activities' i izbjegavamo prelazak na fallback jezik.
// Koristimo i18n.getResource za dohvat iz aktivnog jezika, prvo 'roles.*', zatim 'activities.roles.*'.
const getRoleLabel = (t: TFunction, i18n: I18n, key: string): string => {
  // Podrži varijante jezika (npr. en-GB -> en)
  const candidates = Array.from(new Set([
    i18n.resolvedLanguage,
    i18n.language,
    ...(i18n.language?.includes('-') ? [i18n.language.split('-')[0]] : []),
  ].filter(Boolean))) as string[];

  for (const lng of candidates) {
    const direct = i18n.getResource(lng, 'activities', `roles.${key}`) as string | undefined;
    if (direct) return direct;
    const nested = i18n.getResource(lng, 'activities', `activities.roles.${key}`) as string | undefined;
    if (nested) return nested;
  }

  // Ako ništa nije pronađeno u aktivnom jeziku/varijanti, koristimo standardni t s namespace-om (prepustimo i18nextu fallback chain)
  return t(`roles.${key}`, { ns: 'activities' });
};

const getRoleLabels = (t: TFunction, i18n: I18n): Record<ParticipantRole, string> => ({
  [ParticipantRole.GUIDE]: getRoleLabel(t, i18n, 'guide'),
  [ParticipantRole.ASSISTANT_GUIDE]: getRoleLabel(t, i18n, 'assistantGuide'),
  [ParticipantRole.DRIVER]: getRoleLabel(t, i18n, 'driver'),
  [ParticipantRole.REGULAR]: getRoleLabel(t, i18n, 'regular'),
});

// Funkcija za dobivanje naziva uloge na temelju participant_role enum-a
const getRoleNameByEnum = (participantRole: ParticipantRole | null, t: TFunction, i18n: I18n): string | null => {
  if (!participantRole) return null;
  
  const roleLabels = getRoleLabels(t, i18n);
  return roleLabels[participantRole] || null;
};



const ActivityDetailPage: React.FC = () => {
  const { t, i18n } = useTranslation(['activities', 'common']);
  const { getPrimaryColor } = useBranding();
  const { activityId } = useParams<{ activityId: string }>();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  // Provjeravamo dolazimo li iz prikaza po godini
  const yearParam = searchParams.get('year') ?? '';

  // Dohvat aktivnosti memoiziran zbog ovisnosti u useEffect
  const fetchActivity = React.useCallback(async () => {
    if (!activityId) return;
    try {
      setLoading(true);
      const data = await getActivityById(activityId);
      setActivity(data);
    } catch (err) {
      setError(t('activityDetail.errorFetching'));
      if (isDev) console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activityId, t]);

  useEffect(() => {
    void fetchActivity();
  }, [fetchActivity]);

  const handleCancelConfirm = async () => {
    if (!activityId || !cancellationReason) {
      toast.error(t('activityDetail.cancellationReasonRequired'));
      return;
    }
    if (!activity) return;

    try {
      await apiCancelActivity(activity.activity_id, cancellationReason);
      toast.success(t('activityDetail.cancelSuccess'));
      setIsCancelModalOpen(false);
      setCancellationReason('');
      void fetchActivity(); // Ponovno dohvati podatke da se osvježi status
    } catch (error: unknown) {
      toast.error(t('activityDetail.cancelError'));
      if (isDev) console.error(error);
    }
  };

  const handleJoinActivity = async () => {
    if (!activityId) return;
    try {
      await joinActivity(parseInt(activityId, 10));
      toast.success(t('activityDetail.joinSuccess'));
      void fetchActivity(); // Osvježi podatke da se prikaže novi sudionik
    } catch (error: unknown) {
      let errorMessage = t('activityDetail.joinError');
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const resp = (error as { response?: { data?: { message?: string } } }).response;
        errorMessage = resp?.data?.message ?? errorMessage;
      }
      toast.error(errorMessage);
      if (isDev) console.error(error);
    }
  };

  const handleLeaveActivity = async () => {
    if (!activityId) return;
    try {
      await leaveActivity(parseInt(activityId, 10));
      toast.success(t('activityDetail.leaveSuccess'));
      void fetchActivity(); // Osvježi podatke
    } catch (error: unknown) {
      let errorMessage = t('activityDetail.leaveError');
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const resp = (error as { response?: { data?: { message?: string } } }).response;
        errorMessage = resp?.data?.message ?? errorMessage;
      }
      toast.error(errorMessage);
      if (isDev) console.error(error);
    }
  };

  if (loading) return <div className="text-center p-4">{t('common:loading')}</div>;
  if (error) return <div className="text-center p-4 text-red-500">{error}</div>;
  if (!activity) return <div className="text-center p-4">{t('activityDetail.notFound')}</div>;

  // Provjera je li aktivnost tipa DEŽURSTVA
  const isDutyType = activity.activity_type?.key === 'dezurstva';
  
  // Obični član ne može editirati DEŽURSTVO aktivnost, čak ni ako je organizator
  // Superuser i administrator mogu uvijek editirati
  const canEdit = user?.role === 'member_superuser' 
    || user?.role === 'member_administrator'
    || (user?.member_id === activity.organizer?.member_id && !(user?.role === 'member' && isDutyType));
  
  const isParticipant = activity.participants?.some(p => p.member_id === user?.member_id);
  const canJoin = activity.status === ActivityStatus.PLANNED && !isParticipant && Boolean(user);
  const isCancelled = activity.status === ActivityStatus.CANCELLED;
  const isCompleted = activity.status === ActivityStatus.COMPLETED;

  // Provjera je li aktivnost tipa SASTANCI ili IZLETI prema ključu (key) - stabilniji identifikator
  const isMeetingType = activity.activity_type?.key === 'sastanci';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PLANNED':
        return (
          <Badge
            variant="outline"
            className="flex items-center gap-1"
            style={{ color: getPrimaryColor(), borderColor: getPrimaryColor() }}
          >
            <Calendar className="h-3.5 w-3.5" />
            {t('activityDetail.statuses.planned')}
          </Badge>
        );
      case 'ACTIVE':
        return (
          <Badge variant="default" className="flex items-center gap-1" style={{ backgroundColor: getPrimaryColor() }}>
            <PlayCircle className="h-3.5 w-3.5" />
            {t('activityDetail.statuses.in_progress')}
          </Badge>
        );
      case 'COMPLETED':
        return (
          <Badge variant="secondary" className="flex items-center gap-1 bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t('activityDetail.statuses.completed')}
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" />
            {t('activityDetail.statuses.cancelled')}
          </Badge>
        );
      default:
        return <Badge>{t('activityDetail.statuses.unknown')}</Badge>;
    }
  };

  return (
    <div>
      {activity && (
        <Button 
          asChild 
          variant="ghost" 
          className="mb-4"
        >
          {yearParam ? (
            // Ako imamo parametar godine, vodimo na pregled kategorija za tu godinu
            <TenantLink to={activity.type_id 
              ? `/activities/category/${activity.type_id}?year=${yearParam}` 
              : `/activities/year/${yearParam}`}>
              <ArrowLeft className="mr-2 h-4 w-4" /> 
              {activity.type_id ? t('activityDetail.backToCategory') : t('activityDetail.backToCategories')}
            </TenantLink>
          ) : (
            // Ako nemamo parametar godine, standardni povratak na kategoriju
            <TenantLink to={activity.type_id ? `/activities/category/${activity.type_id}` : "/activities"}>
              <ArrowLeft className="mr-2 h-4 w-4" /> 
              {activity.type_id ? t('activityDetail.backToCategory') : t('common:back')}
            </TenantLink>
          )}
        </Button>
      )}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="mb-4 text-2xl font-bold tracking-tight sm:text-3xl">{activity.name}</CardTitle>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
            <div>

              
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                {getStatusBadge(activity.status)}
                {isCompleted && calculateActivityHours(activity) > 0 && (
                  <Badge variant="default" className="text-white font-mono text-sm" style={{ backgroundColor: getPrimaryColor() }}>
                    {formatHoursToHHMM(calculateActivityHours(activity))}
                  </Badge>
                )}
              </div>
            </div>
            {(canJoin || (canEdit && !isCancelled)) && (
              <div className="flex flex-col gap-1.5 mt-3 w-full sm:flex-row sm:flex-wrap sm:items-start sm:gap-2 sm:mt-0 sm:w-auto">
                {canJoin && (
                  <Button
                    onClick={() => { void handleJoinActivity(); }}
                    variant="default"
                    className="w-full sm:w-auto h-auto py-2 px-1 sm:h-9 sm:py-2 sm:px-3 rounded-md leading-none text-xs sm:text-sm"
                  >
                    <CheckCircle2 className="mr-0.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="text-xs sm:hidden">{t('activityDetail.join')}</span>
                    <span className="hidden sm:inline text-sm">{t('activityDetail.joinActivity')}</span>
                  </Button>
                )}
                {canEdit && !isCancelled && (
                  <div className="flex flex-col gap-1.5 w-full sm:flex-row sm:gap-2 sm:w-auto">
                    <TenantLink to={`/activities/${activity.activity_id}/edit`}>
                      <Button
                        variant="secondary"
                        className="w-full sm:w-auto h-auto py-2 px-1 sm:h-9 sm:py-2 sm:px-3 rounded-md leading-none text-xs sm:text-sm bg-black text-white hover:bg-gray-800"
                      >
                        <Edit className="mr-0.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> 
                        <span className="text-xs sm:text-sm">{t('edit', { ns: 'common' })}</span>
                      </Button>
                    </TenantLink>
                    {!isCompleted && (
                      <Button
                        variant="destructive"
                        className="w-full sm:w-auto h-auto py-2 px-1 sm:h-9 sm:py-2 sm:px-3 rounded-md leading-none text-xs sm:text-sm"
                        onClick={() => setIsCancelModalOpen(true)}
                      >
                        <Ban className="mr-0.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> 
                        <span className="text-xs sm:hidden">{t('activityDetail.cancel')}</span>
                        <span className="hidden sm:inline text-sm">{t('activityDetail.cancelActivity')}</span>
                      </Button>
                    )}
                  </div>
                )}
                {isParticipant && !isCompleted && !isCancelled && (
                  <Button
                    onClick={() => { void handleLeaveActivity(); }}
                    variant="outline"
                    className="w-full sm:w-auto h-auto py-0.5 px-1 sm:h-9 sm:py-2 sm:px-3 rounded-md border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 leading-none text-xs sm:text-sm"
                  >
                    <Ban className="mr-0.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="text-xs sm:hidden">{t('activityDetail.leave')}</span>
                    <span className="hidden sm:inline text-sm">{t('activityDetail.leaveActivity')}</span>
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="overflow-hidden">
          {isCancelled && activity.cancellation_reason && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <h3 className="font-semibold text-red-800">{t('activityDetail.reason')}</h3>
              <p className="text-red-700">{activity.cancellation_reason}</p>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4 sm:gap-6 lg:gap-12">
            <div className="space-y-4">
              <div className="flex items-start">
                <Info className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 mt-1 text-gray-500" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base">{t('activityDetail.description')}</h3>
                  <p className="text-gray-600 text-sm sm:text-base break-all">{activity.description ?? t('activityDetail.noDescription')}</p>
                </div>
              </div>

              <div className="flex items-start">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 mt-1 text-gray-500" />
                <div>
                  <h3 className="font-semibold text-sm sm:text-base">{t('activityDetail.dateTime')}</h3>
                  
                  {/* Provjera ručnog unosa sati NA RAZINI AKTIVNOSTI */}
                  {(activity.manual_hours && activity.manual_hours > 0) || (activity.name?.toLowerCase().includes('ručni unos')) ? (
                    <p className="text-gray-600 text-sm sm:text-base">
                      <span className="font-medium">{t('activityDetail.manualEntry')}</span>
                    </p>
                  ) : (
                    <>
                      <p className="text-gray-600 text-sm sm:text-base">
                        <span className="hidden sm:inline">{t('activityDetail.start')}: </span>
                        <span className="inline sm:hidden">{t('activityDetail.from')}: </span>
                        {activity.actual_start_time
                          ? format(new Date(activity.actual_start_time), 'dd.MM.yyyy HH:mm')
                          : t('activityDetail.notDefined')}
                      </p>
                      <p className="text-gray-600 text-sm sm:text-base">
                        <span className="hidden sm:inline">{t('activityDetail.end')}: </span>
                        <span className="inline sm:hidden">{t('activityDetail.to')}: </span>
                        {activity.actual_end_time
                          ? format(new Date(activity.actual_end_time), 'dd.MM.yyyy HH:mm')
                          : t('activityDetail.notDefined')}
                      </p>
                    </>
                  )}
                  
                  {/* Prikaz postotka priznavanja sati samo ako nije tip SASTANCI ili ako je postotak različit od 100% */}
                  {(typeof activity.recognition_percentage === 'number' && activity.recognition_percentage !== 100) && (
                    <div className="mt-2 border-t border-gray-100 pt-2">
                      <p className="text-gray-600 text-sm sm:text-base">
                        <span className="font-medium">{t('activityDetail.recognitionPercentage')}</span> {activity.recognition_percentage}%
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
                    <h3 className="font-semibold text-sm sm:text-base">{t('activityDetail.organizer')}</h3>
                    <p className="text-gray-900 text-sm sm:text-base">{activity.organizer?.full_name}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 mt-1 text-gray-500" />
                <div>
                  <h3 className="font-semibold text-sm sm:text-base">{t('activityDetail.participants', { count: activity.participants?.length ?? 0 })}</h3>
                  {activity.participants && activity.participants.length > 0 ? (
                    <ul className="list-disc list-outside ml-5 text-gray-900 text-sm sm:text-base space-y-1">
                      {activity.participants.map((p) => (
                        <li key={p.member.member_id}>
                          <span className="text-gray-900">{p.member.full_name}</span>
                          {/* Prikaz uloge samo za izlete */}
                                            {activity?.activity_type?.key === 'izleti' && p.participant_role && p.participant_role !== ParticipantRole.REGULAR && (() => {
                            const roleName = getRoleNameByEnum(p.participant_role, t, i18n);
                            return roleName ? (
                              <Badge variant="outline" className="ml-2 border-amber-300 text-amber-700 bg-amber-50 text-xs">
                                {roleName}
                              </Badge>
                            ) : null;
                          })()}
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <Clock className="h-3 w-3 mr-1" />
                            <span>{t('activityDetail.recognizedHours')} {formatHoursToHHMM(p.recognized_hours)}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>{t('activityDetail.noParticipants')}</p>
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
            <DialogTitle>{t('activityDetail.cancelModalTitle')}</DialogTitle>
            <DialogDescription>{t('activityDetail.cancelModalDescription')}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder={t('activityDetail.cancelModalPlaceholder')}
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCancelModalOpen(false)}>
              {t('common:cancel')}
            </Button>
            <Button variant="destructive" onClick={() => { void handleCancelConfirm(); }} disabled={!cancellationReason.trim()}>
              {t('activityDetail.confirmCancellation')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ActivityDetailPage;
