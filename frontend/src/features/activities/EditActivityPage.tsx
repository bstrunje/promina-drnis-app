import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { getActivityById, updateActivity } from '../../utils/api/apiActivities';
import { ActivityStatus } from '@shared/activity.types';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Input } from '@components/ui/input';
import { Textarea } from '@components/ui/textarea';
import { Label } from '@components/ui/label';
import { useToast } from '@components/ui/use-toast';
import { format, parseISO } from 'date-fns';
import { Clock, X } from 'lucide-react';
import MemberRoleSelect from './MemberRoleSelect';
import { MemberWithRole, ParticipantRole, rolesToRecognitionPercentage } from './memberRole';
import { MemberSelect } from './MemberSelect';

const EditActivityPage: React.FC = () => {
  const { t } = useTranslation('activities');
  const { activityId } = useParams<{ activityId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  // Stanja za formu
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [actualStartDate, setActualStartDate] = useState('');
  const [actualStartTime, setActualStartTime] = useState('');
  const [actualEndDate, setActualEndDate] = useState('');
  const [actualEndTime, setActualEndTime] = useState('');
  const [manualHours, setManualHours] = useState<string>('');
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [participantsWithRoles, setParticipantsWithRoles] = useState<MemberWithRole[]>([]);
  const [recognitionPercentage, setRecognitionPercentage] = useState('100');
  const [isExcursion, setIsExcursion] = useState(false);
  const [status, setStatus] = useState<ActivityStatus | null>(null);

  // Refovi za fokus
  const startTimeRef = useRef<HTMLInputElement>(null);
  const actualStartTimeRef = useRef<HTMLInputElement>(null);
  const actualEndTimeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchActivity = async () => {
      if (!activityId) return;
      try {
        setLoading(true);
        const data = await getActivityById(activityId);
        
        // Popunjavanje stanja forme s postojećim podacima
        setName(data.name ?? '');
        setDescription(data.description ?? '');
        setStatus(data.status);

        const formatDate = (dateInput: Date | string | null | undefined) => {
          if (!dateInput) return { date: '', time: '' };
          const dateObj = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
          return {
            date: format(dateObj, 'yyyy-MM-dd'),
            time: format(dateObj, 'HH:mm'),
          };
        };

        const start = formatDate(data.start_date);
        setStartDate(start.date);
        setStartTime(start.time);

        const actualStart = formatDate(data.actual_start_time);
        setActualStartDate(actualStart.date);
        setActualStartTime(actualStart.time);

        const actualEnd = formatDate(data.actual_end_time);
        setActualEndDate(actualEnd.date);
        setActualEndTime(actualEnd.time);

        // Dodajemo dohvaćanje manual_hours vrijednosti
        const participantsWithManualHours = data.participants?.find(p => p.manual_hours !== null && p.manual_hours !== undefined);
        if (participantsWithManualHours?.manual_hours) {
          setManualHours(participantsWithManualHours.manual_hours.toString());
        }

        const isExcursionActivity = data.activity_type?.key === 'izleti';
        setIsExcursion(isExcursionActivity);

        if (isExcursionActivity) {
          const getRoleByPercentage = (percentage: number | null | undefined): ParticipantRole => {
            if (percentage === null || percentage === undefined) return ParticipantRole.REGULAR;
            const roleEntry = Object.entries(rolesToRecognitionPercentage).find(([, value]) => value === percentage);
            return (roleEntry ? roleEntry[0] : ParticipantRole.REGULAR) as ParticipantRole;
          };

          const initialParticipants = data.participants?.map(p => ({
            memberId: p.member.member_id.toString(),
            fullName: p.member.full_name,
            role: getRoleByPercentage(p.recognition_override),
            manualRecognition: !Object.values(rolesToRecognitionPercentage).includes(p.recognition_override ?? -1) ? p.recognition_override ?? undefined : undefined,
          })) ?? [];
          setParticipantsWithRoles(initialParticipants);
        } else {
          setParticipantIds(data.participants?.map(p => p.member.member_id.toString()) ?? []);
          setRecognitionPercentage(data.recognition_percentage?.toString() ?? '100');
        }

      } catch {
        toast({ title: t('editing.error'), description: t('editing.fetchFailed'), variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    void fetchActivity();
  }, [activityId, toast, t]);

  const handleSetNow = (
    dateSetter: React.Dispatch<React.SetStateAction<string>>,
    timeSetter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const now = new Date();
    dateSetter(format(now, 'yyyy-MM-dd'));
    timeSetter(format(now, 'HH:mm'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityId || !name || !startDate || !startTime) {
        toast({ title: t('editing.error'), description: t('editing.validationFailed'), variant: 'destructive' });
        return;
    }

    const combineDateTime = (date: string, time: string) => {
        return date && time ? new Date(`${date}T${time}`).toISOString() : undefined;
    }

    const dataToUpdate = {
        name,
        description,
        start_date: combineDateTime(startDate, startTime),
        actual_start_time: manualHours ? null : combineDateTime(actualStartDate, actualStartTime),
        actual_end_time: manualHours ? null : combineDateTime(actualEndDate, actualEndTime),
        recognition_percentage: !isExcursion ? Number(recognitionPercentage) : undefined,
        participations: isExcursion
          ? participantsWithRoles.map(p => ({
              member_id: Number(p.memberId),
              recognition_override: p.manualRecognition ?? rolesToRecognitionPercentage[p.role],
            }))
          : undefined,
        participant_ids: !isExcursion ? participantIds.map(id => Number(id)) : undefined,
        // Dodajemo manual_hours za ažuriranje - backend će ga primijeniti na sve sudionike
        manual_hours: manualHours ? Number(manualHours) : null,
    };

    try {
      await updateActivity(Number(activityId), dataToUpdate);
      toast({ title: t('editing.success'), description: t('editing.activityUpdated') });
      navigate(`/activities/${activityId}`);
    } catch {
      toast({ title: t('editing.error'), description: t('editing.updateFailed'), variant: 'destructive' });
    }
  };

  if (loading) return <div className="container mx-auto p-4">{t('editing.loading')}</div>;

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('editing.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { void handleSubmit(e); }}>
            <div className="grid gap-6">
              <div>
                <Label htmlFor="name">{t('editing.activityName')}</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="description">{t('editing.description')}</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>

              {/* Polje za datum početka */}
              <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-2 md:gap-4">
                <Label htmlFor="startDate" className="md:text-right">{t('editing.startDateTime')}</Label>
                <div className="md:col-span-3 flex items-center gap-2">
                  <Input id="startDate" type="date" className="w-40 hide-date-time-icons" value={startDate} onChange={e => { setStartDate(e.target.value); if (parseInt(e.target.value.substring(0, 4), 10) > 1000) startTimeRef.current?.focus(); }} required />
                  <Input id="startTime" type="time" ref={startTimeRef} className="w-28 hide-date-time-icons" value={startTime} onChange={e => setStartTime(e.target.value)} required />
                  <Button type="button" variant="secondary" size="icon" onClick={() => handleSetNow(setStartDate, setStartTime)}><Clock className="h-4 w-4" /></Button>
                </div>
              </div>

              {/* Polje za stvarni početak */}
              <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-2 md:gap-4">
                <Label htmlFor="actualStartDate" className="md:text-right">{t('editing.actualStartTime')}</Label>
                <div className="md:col-span-3 flex items-center gap-2">
                  <Input 
                    id="actualStartDate" 
                    type="date" 
                    className="w-40 hide-date-time-icons"
                    value={actualStartDate} 
                    onChange={e => { 
                      // Ako se dodaje stvarni početak, resetirati ručni unos sati
                      if (e.target.value && manualHours) {
                        setManualHours('');
                      }
                      setActualStartDate(e.target.value); 
                      if (parseInt(e.target.value.substring(0, 4), 10) > 1000) actualStartTimeRef.current?.focus(); 
                    }} 
                    disabled={!!manualHours}
                  />
                  <Input 
                    id="actualStartTime" 
                    type="time" 
                    ref={actualStartTimeRef} 
                    className="w-28 hide-date-time-icons"
                    value={actualStartTime} 
                    onChange={e => {
                      // Ako se dodaje stvarni početak, resetirati ručni unos sati
                      if (e.target.value && manualHours) {
                        setManualHours('');
                      }
                      setActualStartTime(e.target.value);
                    }}
                    disabled={!!manualHours}
                  />
                  <Button 
                    type="button" 
                    variant="secondary" 
                    size="icon" 
                    onClick={() => {
                      // Resetirati ručni unos sati prije postavljanja stvarnog vremena
                      if (manualHours) {
                        setManualHours('');
                      }
                      handleSetNow(setActualStartDate, setActualStartTime);
                    }}
                    disabled={!!manualHours}
                  >
                    <Clock className="h-4 w-4" />
                  </Button>
                  {(status === ActivityStatus.PLANNED || status === ActivityStatus.ACTIVE) && actualStartDate && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => {
                        setActualStartDate('');
                        setActualStartTime('');
                      }}
                    >
                      <X className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Polje za stvarni završetak */}
              <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-2 md:gap-4">
                <Label htmlFor="actualEndDate" className="md:text-right">{t('editing.actualEndTime')}</Label>
                <div className="md:col-span-3 flex items-center gap-2">
                  <Input 
                    id="actualEndDate" 
                    type="date" 
                    className="w-40 hide-date-time-icons"
                    value={actualEndDate} 
                    onChange={e => { 
                      // Ako se dodaje stvarni završetak, resetirati ručni unos sati
                      if (e.target.value && manualHours) {
                        setManualHours('');
                      }
                      setActualEndDate(e.target.value); 
                      if (parseInt(e.target.value.substring(0, 4), 10) > 1000) actualEndTimeRef.current?.focus(); 
                    }} 
                    disabled={!!manualHours}
                  />
                  <Input 
                    id="actualEndTime" 
                    type="time" 
                    ref={actualEndTimeRef} 
                    className="w-28 hide-date-time-icons"
                    value={actualEndTime} 
                    onChange={e => {
                      // Ako se dodaje stvarni završetak, resetirati ručni unos sati
                      if (e.target.value && manualHours) {
                        setManualHours('');
                      }
                      setActualEndTime(e.target.value);
                    }}
                    disabled={!!manualHours}
                  />
                  <Button 
                    type="button" 
                    variant="secondary" 
                    size="icon" 
                    onClick={() => {
                      // Resetirati ručni unos sati prije postavljanja stvarnog vremena
                      if (manualHours) {
                        setManualHours('');
                      }
                      handleSetNow(setActualEndDate, setActualEndTime);
                    }}
                    disabled={!!manualHours}
                  >
                    <Clock className="h-4 w-4" />
                  </Button>
                  {(status === ActivityStatus.PLANNED || status === ActivityStatus.ACTIVE) && actualEndDate && (
                   <Button
                     type="button"
                     variant="destructive"
                     size="icon"
                     onClick={() => {
                       setActualEndDate('');
                       setActualEndTime('');
                     }}
                   >
                     <X className="h-4 w-4 text-red-500" />
                   </Button>
                  )}
                </div>
              </div>

              {/* Polje za ručni unos sati */}
              <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-2 md:gap-4">
                <Label htmlFor="manualHours" className="md:text-right">{t('editing.manualHours')}</Label>
                <div className="md:col-span-3">
                  <Input
                    id="manualHours"
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder={t('creation.manualHoursPlaceholder')}
                    value={manualHours}
                    onChange={e => {
                      const value = e.target.value;
                      setManualHours(value);
                      
                      // Ako se unose ručni sati, resetirati vremena početka i završetka
                      if (value) {
                        setActualStartDate('');
                        setActualStartTime('');
                        setActualEndDate('');
                        setActualEndTime('');
                      }
                    }}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Postotak priznavanja - prikazuje se samo ako NIJE izlet */}
              {!isExcursion && (
                <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-2 md:gap-4">
                  <Label htmlFor="recognition_percentage" className="md:text-right">
                    {t('editing.recognitionPercentage')}
                  </Label>
                  <div className="md:col-span-3">
                    <Input
                      id="recognition_percentage"
                      type="number"
                      value={recognitionPercentage}
                      onChange={(e) => setRecognitionPercentage(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
              )}

              {/* Odabir sudionika */}
              <div className="grid grid-cols-1 md:grid-cols-4 items-start gap-2 md:gap-4">
                <Label className="md:text-right pt-2">{t('editing.participants')}</Label>
                <div className="md:col-span-3">
                  {isExcursion ? (
                    <MemberRoleSelect selectedMembers={participantsWithRoles} onSelectionChange={setParticipantsWithRoles} />
                  ) : (
                    <MemberSelect selectedMemberIds={participantIds} onSelectionChange={setParticipantIds} />
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                 <Button type="button" variant="outline" onClick={() => navigate(-1)}>{t('cancel', { ns: 'common' })}</Button>
                <Button type="submit">{t('save', { ns: 'common' })}</Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditActivityPage;
