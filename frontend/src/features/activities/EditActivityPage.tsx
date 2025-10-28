import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useTenantNavigation } from '../../hooks/useTenantNavigation';
import { getActivityById, updateActivity, updateParticipationAdmin } from '../../utils/api/apiActivities';
import { ActivityStatus, ActivityParticipation } from '@shared/activity.types';
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
import { formatHoursToHHMM } from '../../utils/activityHours';

const EditActivityPage: React.FC = () => {
  const { t } = useTranslation('activities');
  const { activityId } = useParams<{ activityId: string }>();
  const { navigateTo } = useTenantNavigation();
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
  const [isAdjustableType, setIsAdjustableType] = useState(false);
  const [status, setStatus] = useState<ActivityStatus | null>(null);
  // Dodatno: raw sudionici za izračun po sudioniku (Dežurstva/Akcije)
  // Tipizirano kao ActivityParticipation[] kako bi se izbjegao any i osigurala validacija tipova
  const [participantsRaw, setParticipantsRaw] = useState<ActivityParticipation[]>([]);
  // Dozvola za prikaz per-sudionik prilagodbi (+/-) samo za određene tipove
  // Lokalne prilagodbe (delta) po sudioniku: participation_id -> delta sati
  const [participantDeltas, setParticipantDeltas] = useState<Record<number, number>>({});
  // Početno stanje sudionika radi usporedbe pri spremanju (ne šaljemo ako nije mijenjano)
  const initialParticipantIdsRef = useRef<string[] | null>(null);
  const initialParticipantsWithRolesRef = useRef<MemberWithRole[] | null>(null);

  // Refovi za fokus
  const startTimeRef = useRef<HTMLInputElement>(null);
  const actualStartTimeRef = useRef<HTMLInputElement>(null);
  const actualEndTimeRef = useRef<HTMLInputElement>(null);

  const baseActivityHours = useMemo(() => {
    if (manualHours && Number(manualHours) > 0) {
      return Number(manualHours);
    }
    if (actualStartDate && actualStartTime && actualEndDate && actualEndTime) {
      const start = parseISO(`${actualStartDate}T${actualStartTime}`);
      const end = parseISO(`${actualEndDate}T${actualEndTime}`);
      if (end > start) {
        const diffInSeconds = (end.getTime() - start.getTime()) / 1000;
        return Math.max(0, parseFloat((diffInSeconds / 3600).toFixed(2)));
      }
    }
    return 0;
  }, [manualHours, actualStartDate, actualStartTime, actualEndDate, actualEndTime]);

  useEffect(() => {
    if (baseActivityHours > 0) {
      setParticipantsRaw(prevParticipants =>
        prevParticipants.map(p => ({
          ...p,
          // Priznati sati su ili već ručno uneseni, ili preuzimaju novu bazu
          recognized_hours: p.manual_hours ?? baseActivityHours,
        }))
      );
    }
  }, [baseActivityHours]);

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
        if (data.manual_hours) {
          setManualHours(data.manual_hours.toString());
        }

        const isExcursionActivity = data.activity_type?.key === 'izleti';
        setIsExcursion(isExcursionActivity);
        // Određivanje dopuštenih tipova za per-sudionik prilagodbe sati
        const adjustableKeys = ['dezurstva', 'akcija-drustvo', 'akcija-trail'];
        setIsAdjustableType(adjustableKeys.includes(data.activity_type?.key ?? ''));

        if (isExcursionActivity) {
          const getRoleByPercentage = (percentage: number | null | undefined): ParticipantRole => {
            if (percentage === null || percentage === undefined) return ParticipantRole.REGULAR;
            const roleEntry = Object.entries(rolesToRecognitionPercentage).find(([, value]) => value === percentage);
            return (roleEntry ? roleEntry[0] : ParticipantRole.REGULAR) as ParticipantRole;
          };

          const initialParticipants = (data.participants ?? [])
            .filter(p => p.member) // Osigurava da ne pokušavamo pristupiti podacima nepostojećeg člana
            .map(p => ({
              memberId: p.member.member_id.toString(),
              fullName: p.member.full_name,
              role: p.participant_role ?? getRoleByPercentage(p.recognition_override),
              manualRecognition: !Object.values(rolesToRecognitionPercentage).includes(p.recognition_override ?? -1) ? p.recognition_override ?? undefined : undefined,
            }));
          setParticipantsWithRoles(initialParticipants);
          // Spremi inicijalno stanje za kasniju usporedbu
          initialParticipantsWithRolesRef.current = initialParticipants;
        } else {
          const validParticipants = (data.participants ?? []).filter(p => p.member);
          setParticipantIds(validParticipants.map(p => p.member.member_id.toString()));
          // Spremimo raw sudionike radi izračuna baze sati i prikaza (+/-)
          setParticipantsRaw(validParticipants);
          setRecognitionPercentage(data.recognition_percentage?.toString() ?? '100');
          // Spremi inicijalno stanje za kasniju usporedbu
          initialParticipantIdsRef.current = validParticipants.map(p => p.member.member_id.toString());
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

    // Pomoćne funkcije za usporedbu skupova
    const arraysEqual = (a: string[], b: string[]) => {
      if (a.length !== b.length) return false;
      const as = [...a].sort();
      const bs = [...b].sort();
      return as.every((v, i) => v === bs[i]);
    };
    const rolesEqual = (a: MemberWithRole[], b: MemberWithRole[]) => {
      if (a.length !== b.length) return false;
      const norm = (arr: MemberWithRole[]) => arr
        .map(p => ({ id: p.memberId, val: (p.manualRecognition ?? rolesToRecognitionPercentage[p.role]) }))
        .sort((x, y) => Number(x.id) - Number(y.id));
      const na = norm(a);
      const nb = norm(b);
      return na.every((v, i) => v.id === nb[i].id && v.val === nb[i].val);
    };

    // Odredi jesu li sudionici mijenjani
    const participantsChanged = (() => {
      if (isExcursion) {
        if (!initialParticipantsWithRolesRef.current) return true;
        return !rolesEqual(participantsWithRoles, initialParticipantsWithRolesRef.current);
      } else {
        if (!initialParticipantIdsRef.current) return true;
        return !arraysEqual(participantIds, initialParticipantIdsRef.current);
      }
    })();

    // Tip payload-a preuzimamo iz updateActivity() kako bismo ostali u skladu s API slojem
    type ActivityUpdatePayload = Parameters<typeof updateActivity>[1];
    const dataToUpdate: ActivityUpdatePayload = {};

    // Obavezna tekstualna polja
    dataToUpdate.name = name;
    dataToUpdate.description = description;

    // Datumi/vremena: samo postavi ako postoje vrijednosti (ili eksplicitni null kada imamo ručne sate)
    const startISO = combineDateTime(startDate, startTime);
    if (startISO) dataToUpdate.start_date = startISO; // string je kompatibilan s Date | string

    if (manualHours) {
      dataToUpdate.manual_hours = Number(manualHours);
      dataToUpdate.actual_start_time = null;
      dataToUpdate.actual_end_time = null;
    } else {
      const actualStartISO = combineDateTime(actualStartDate, actualStartTime);
      const actualEndISO = combineDateTime(actualEndDate, actualEndTime);
      if (actualStartISO) dataToUpdate.actual_start_time = actualStartISO;
      if (actualEndISO) dataToUpdate.actual_end_time = actualEndISO;

      // Ako su vremena postavljena, osiguraj da su ručni sati poništeni
      if (actualStartISO || actualEndISO) {
        dataToUpdate.manual_hours = null;
      }
    }

    // Postotak priznavanja: samo ako NIJE izlet
    if (!isExcursion) {
      dataToUpdate.recognition_percentage = Number(recognitionPercentage);
    }

    // SLANJE PODATAKA O SATIMA - KLJUČNA LOGIKA
    // Slanje individualnih sati SAMO za tipove aktivnosti koji to podržavaju
    // i samo ako su napravljene promjene (postoje delte).
    if (isAdjustableType && Object.keys(participantDeltas).length > 0) {
      // Filtriramo samo one sudionike koji imaju stvarnu promjenu (delta != 0)
      const participantsUpdateData = participantsRaw
        .filter(p => (participantDeltas[p.participation_id] ?? 0) !== 0)
        .map(p => {
          const deltaIntervals = participantDeltas[p.participation_id] ?? 0;
          const deltaHours = deltaIntervals * 0.25;
          // Osnova za izračun je baza aktivnosti (ne recognized_hours, jer je već s priznavanjem)
          const calculationBase = baseActivityHours;
          const finalHours = Math.max(0, parseFloat((calculationBase + deltaHours).toFixed(2)));
          return {
            member_id: p.member.member_id,
            manual_hours: finalHours,
          };
        });
      if (participantsUpdateData.length > 0) {
        dataToUpdate.participations = participantsUpdateData;
      }
    } else if (participantsChanged) {
      // Ako su se sudionici promijenili (dodani/uklonjeni), ali bez individualnih sati,
      // pošalji samo ID-jeve da backend može ažurirati popis.
      dataToUpdate.participant_ids = isExcursion 
        ? participantsWithRoles.map(p => Number(p.memberId))
        : participantIds.map(Number);
    }

    try {
      // 1. Slanje glavnih podataka o aktivnosti, uključujući konačne sate za svakog sudionika.
      // Backend će na temelju ovoga izračunati i spremiti sve potrebne promjene.
      await updateActivity(Number(activityId), dataToUpdate);

      // 2. Za izlete, dodatno spremi uloge kroz recognition_override nakon što su sudionici ažurirani
      if (isExcursion && participantsChanged) {
        const updatedActivity = await getActivityById(activityId);
        const updatedParticipants = updatedActivity.participants ?? [];
        
        for (const memberWithRole of participantsWithRoles) {
          const participation = updatedParticipants.find(p => p.member.member_id.toString() === memberWithRole.memberId);
          
          if (participation) {
            // recognition_override je SAMO za ručne izmjene, ne za role-based postotak
            // Role-based postotak se automatski primjenjuje na backendu
            const recognitionOverrideValue = memberWithRole.manualRecognition ?? null;
            
            await updateParticipationAdmin(participation.participation_id, { 
              recognition_override: recognitionOverrideValue,
              participant_role: memberWithRole.role
            });
          }
        }
      }
      
      toast({ title: t('editing.success'), description: t('editing.activityUpdated') });
      navigateTo(`/activities/${activityId}`);
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
              {/* Naslov aktivnosti */}
              <div>
                <Label htmlFor="name">{t('editing.name')}</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              {/* Opis aktivnosti */}
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

              {/* Prikaz baznih rezultata za sve sudionike (samo ako imaju spremljene manual_hours) */}
                            {/* Prikaz prilagodbi po sudioniku - prikazuje se ako nije izlet, ima sudionika i tip aktivnosti to dopušta */}
              {isAdjustableType && !isExcursion && participantsRaw.length > 0 && baseActivityHours > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 items-start gap-2 md:gap-4">
                  <Label className="md:text-right pt-2">{t('editing.perParticipantAdjustments')}</Label>
                  <div className="md:col-span-3 space-y-2">
                    <ul className="space-y-2">
                      {participantsRaw.map((p: ActivityParticipation) => (
                        <ParticipantAdjustmentRow 
                          key={p.participation_id} 
                          participant={p} 
                          baseActivityHours={baseActivityHours}
                          participantDeltas={participantDeltas} 
                          setParticipantDeltas={setParticipantDeltas} />
                      ))}
                    </ul>
                    <p className="text-xs text-muted-foreground">{t('editing.perParticipantHint')}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                 <Button type="button" variant="outline" onClick={() => navigateTo(-1)}>{t('cancel', { ns: 'common' })}</Button>
                <Button type="submit">{t('save', { ns: 'common' })}</Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

// ======================================================================================
// Sub-komponenta za redak prilagodbe sudionika
// ======================================================================================

interface ParticipantAdjustmentRowProps {
  participant: ActivityParticipation;
  baseActivityHours: number;
  participantDeltas: Record<number, number>;
  setParticipantDeltas: React.Dispatch<React.SetStateAction<Record<number, number>>>;
}

const ParticipantAdjustmentRow: React.FC<ParticipantAdjustmentRowProps> = ({ participant, baseActivityHours, participantDeltas, setParticipantDeltas }) => {
  const { t } = useTranslation('activities');

  // Baza za prikaz je globalna vrijednost aktivnosti.
  const displayBaseHours = baseActivityHours;
  // Baza za izračun su TRENUTNO PRIZNATI sati sudionika.
  const calculationBaseHours = participant.recognized_hours ?? 0;

  const deltaIntervals = participantDeltas[participant.participation_id] ?? 0;
  const deltaHours = deltaIntervals * 0.25;
  const newTotal = Math.max(0, parseFloat((calculationBaseHours + deltaHours).toFixed(2)));

  const updateDelta = useCallback((changeIntervals: number) => {
    setParticipantDeltas(prev => {
      const currentDelta = prev[participant.participation_id] ?? 0;
      let newDelta = currentDelta + changeIntervals;
      
      // Ne dopuštamo da novi ukupni sati padnu ispod nule
      const newTotalHours = calculationBaseHours + (newDelta * 0.25);
      if (newTotalHours < 0) {
        newDelta = (-calculationBaseHours / 0.25);
      }

      return { ...prev, [participant.participation_id]: newDelta };
    });
  }, [calculationBaseHours, participant.participation_id, setParticipantDeltas]);

  return (
    <li className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border rounded-md p-2">
      <div className="text-sm">
        <div className="font-medium">{participant.member.full_name}</div>
        <div className="text-xs text-muted-foreground">
          {t('editing.baseHours')}: {formatHoursToHHMM(displayBaseHours)} · {t('editing.currentRecognized')}: {formatHoursToHHMM(participant.recognized_hours ?? 0)}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="px-2 py-1 border rounded hover:bg-muted"
          onClick={() => updateDelta(-1)} // -1 interval = -15 min
          aria-label={t('editing.decrease')}
        >
          − 15min
        </button>
        <button
          type="button"
          className="px-2 py-1 border rounded hover:bg-muted"
          onClick={() => updateDelta(1)} // +1 interval = +15 min
          aria-label={t('editing.increase')}
        >
          + 15min
        </button>
        <div className="text-sm w-28 text-right">{t('editing.newTotal')}: <span className="font-mono">{formatHoursToHHMM(newTotal)}</span></div>
      </div>
    </li>
  );
};

export default EditActivityPage;
