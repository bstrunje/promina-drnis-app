import React, { useState, useRef, useEffect } from 'react';
const isDev = import.meta.env.DEV;
import { useTranslation } from 'react-i18next';
import './activities.css';
import { createActivity, getActivityTypes } from '@/utils/api/apiActivities';
import { Dialog, DialogPortal, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@components/ui/dialog';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select';
import { useToast } from '@components/ui/use-toast';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';
import { MemberSelect } from './MemberSelect';
import MemberRoleSelect from './MemberRoleSelect';
import { MemberWithRole } from './memberRole';
import { ActivityType } from '@shared/activity.types';
import { SelectPortal } from '@radix-ui/react-select';

interface CreateActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivityCreated: () => void;
  activityTypeId: string | null;
}

const CreateActivityModal: React.FC<CreateActivityModalProps> = ({ isOpen, onClose, onActivityCreated, activityTypeId }) => {
  const { t } = useTranslation('activities');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('');
  const [actualStartDate, setActualStartDate] = useState('');
  const [actualStartTime, setActualStartTime] = useState('');
  const [actualEndDate, setActualEndDate] = useState('');
  const [actualEndTime, setActualEndTime] = useState('');
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [participantsWithRoles, setParticipantsWithRoles] = useState<MemberWithRole[]>([]);
  const [recognitionPercentage, setRecognitionPercentage] = useState('100');
  const [manualHours, setManualHours] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  
  // Dodajemo stanje za tipove aktivnosti i odabrani tip
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string>(activityTypeId ?? '');
  const [loadingTypes, setLoadingTypes] = useState<boolean>(false);

  const startTimeRef = useRef<HTMLInputElement>(null);
  const actualStartTimeRef = useRef<HTMLInputElement>(null);
  const actualEndTimeRef = useRef<HTMLInputElement>(null);

  // Dohvaćanje tipova aktivnosti
  useEffect(() => {
    if (isOpen) {
      const fetchActivityTypes = async () => {
        setLoadingTypes(true);
        try {
          const types = await getActivityTypes();
          setActivityTypes(types);
        } catch (err) {
          if (isDev) console.error('Greška prilikom dohvaćanja tipova aktivnosti:', err);
          setError(t('creation.errors.fetchTypes'));
        } finally {
          setLoadingTypes(false);
        }
      };
      void fetchActivityTypes();
    }
  }, [isOpen, t]);

  // Postavljanje defaultnog tipa aktivnosti nakon dohvaćanja
  useEffect(() => {
    // Postavi defaultni tip aktivnosti samo ako su tipovi učitani i ako već nije odabran
    if (activityTypes.length > 0 && !selectedTypeId) {
      setSelectedTypeId(String(activityTypes[0].type_id));
    }
    // Ovaj hook ovisi samo o `activityTypes`. Ne želimo ga ponovno pokretati kad se `selectedTypeId` promijeni.
  }, [activityTypes, selectedTypeId]);
  
  // Efekt koji prati promjenu tipa aktivnosti
  useEffect(() => {
    // Resetiranje sudionika kad se promijeni tip aktivnosti
    setParticipantIds([]);
    setParticipantsWithRoles([]);
  }, [selectedTypeId]);

  // Naslov se više ne generira automatski na frontendu - backend će ga generirati iz datuma i opisa

  const handleSetNow = (
    dateSetter: React.Dispatch<React.SetStateAction<string>>,
    timeSetter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const now = new Date();
    dateSetter(format(now, 'yyyy-MM-dd'));
    timeSetter(format(now, 'HH:mm'));
  };

  const isExcursion = activityTypes.find(type => type.type_id.toString() === activityTypeId)?.key === 'izleti';

  const handleSubmit = async () => {
    const newFieldErrors: Record<string, string> = {};
    
    if (!description) newFieldErrors.description = 'Opis je obavezan';
    if (!startDate) newFieldErrors.startDate = 'Datum početka je obavezan';
    if (!startTime) newFieldErrors.startTime = 'Vrijeme početka je obavezno';
    if (!selectedTypeId) newFieldErrors.selectedTypeId = 'Tip aktivnosti je obavezan';
    
    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      return;
    }
    
    setFieldErrors({});
    setIsLoading(true);
    setError(null);

    const combinedStartDate = `${startDate}T${startTime}`;
    const combinedActualStartTime = actualStartDate && actualStartTime ? `${actualStartDate}T${actualStartTime}` : null;
    const combinedActualEndTime = actualEndDate && actualEndTime ? `${actualEndDate}T${actualEndTime}` : null;
    
    // Provjeri je li odabrani tip aktivnosti "izleti"
    const isExcursionActivity = activityTypes.find(type => type.type_id === Number(selectedTypeId))?.key === 'izleti';
    
    try {
      if (isExcursionActivity && participantsWithRoles.length > 0) {
        // Za izlete koristimo participations s ulogama
        const payload = {
          // name se ne šalje - backend će ga generirati iz datuma i opisa
          description,
          start_date: new Date(combinedStartDate),
          // Ako su uneseni ručni sati, ne šaljemo stvarna vremena
          actual_start_time: manualHours ? null : (combinedActualStartTime ? new Date(combinedActualStartTime) : null),
          actual_end_time: manualHours ? null : (combinedActualEndTime ? new Date(combinedActualEndTime) : null),
          activity_type_id: Number(selectedTypeId),
          recognition_percentage: Number(recognitionPercentage), // Dodano radi usklađivanja s tipom
          manual_hours: manualHours ? Number(manualHours) : null,
          participations: participantsWithRoles.map(p => ({
            member_id: Number(p.memberId),
            participant_role: p.role,
            // Za IZLETI: recognition_override je null (role-based postotak se primjenjuje automatski)
            // Osim ako korisnik ručno postavi manualRecognition
            recognition_override: p.manualRecognition ?? null
          }))
        };

        await createActivity(payload);
      } else {
        // Za ostale tipove aktivnosti koristimo standardni način
        await createActivity({
          // name se ne šalje - backend će ga generirati iz datuma i opisa
          description,
          start_date: new Date(combinedStartDate),
          // Ako su uneseni ručni sati, ne šaljemo stvarna vremena
          actual_start_time: manualHours ? null : (combinedActualStartTime ? new Date(combinedActualStartTime) : null),
          actual_end_time: manualHours ? null : (combinedActualEndTime ? new Date(combinedActualEndTime) : null),
          activity_type_id: Number(selectedTypeId),
          recognition_percentage: Number(recognitionPercentage),
          manual_hours: manualHours ? Number(manualHours) : null,
          participant_ids: participantIds.map(id => Number(id)),
        });
      }
      toast({ title: t('creation.success'), description: t('creation.activityCreated') });
      onActivityCreated();
      // Reset form
      setDescription('');
      setStartDate(format(new Date(), 'yyyy-MM-dd'));
      setStartTime('');
      setActualStartDate('');
      setActualStartTime('');
      setActualEndDate('');
      setActualEndTime('');
      setManualHours('');
      setRecognitionPercentage('100');
      setParticipantIds([]);
      onClose();
    } catch (err) {
      if (isDev) console.error('Greška prilikom kreiranja aktivnosti:', err);
      setError(t('error', { ns: 'common' }));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">{t('creation.title')}</DialogTitle>
          <DialogDescription>{t('creation.description')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:gap-4 py-3 sm:py-4">
          {/* Odabir tipa aktivnosti */}
          <div className="grid sm:grid-cols-4 items-start sm:items-center gap-1 sm:gap-4">
            <Label htmlFor="activityType" className="sm:text-right text-sm sm:text-base mb-1 sm:mb-0">
              {t('creation.activityType')}
            </Label>
            <div className="sm:col-span-3">
              <Select value={selectedTypeId} onValueChange={(value) => {
                setSelectedTypeId(value);
                setFieldErrors(prev => ({ ...prev, selectedTypeId: '' }));
              }} disabled={loadingTypes}>
                <SelectTrigger className={fieldErrors.selectedTypeId ? 'border-red-500' : ''}>
                  <SelectValue placeholder={t('creation.selectActivityType')} />
                </SelectTrigger>
                <SelectPortal>
                  <SelectContent className="z-[9999]" position="popper" sideOffset={5}>
                    {activityTypes.map((type) => (
                      <SelectItem key={type.type_id} value={String(type.type_id)}>
                        {(type.custom_label ?? t(`types.${type.key}`)).toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </SelectPortal>
              </Select>
              {fieldErrors.selectedTypeId && <p className="text-red-500 text-xs mt-1">{t('creation.validation.activityTypeRequired')}</p>}
              {loadingTypes && <p className="text-sm text-muted-foreground mt-1">{t('creation.loadingTypes')}</p>}
            </div>
          </div>

          {/* Opis aktivnosti - koristi se za generiranje naslova na backendu */}
          <div className="grid sm:grid-cols-4 items-start sm:items-center gap-1 sm:gap-4">
            <Label htmlFor="description" className="sm:text-right text-sm sm:text-base mb-1 sm:mb-0">
              {t('creation.descriptionLabel')}
            </Label>
            <div className="sm:col-span-3">
              <Input
                id="description"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setFieldErrors(prev => ({ ...prev, description: '' }));
                }}
                placeholder={t('creation.descriptionPlaceholder')}
                className={`w-full ${fieldErrors.description ? 'border-red-500' : ''}`}
              />
              {fieldErrors.description && <p className="text-red-500 text-xs mt-1">{t('creation.validation.descriptionRequired')}</p>}
            </div>
          </div>

          {/* Datum početka */}
          <div className="grid sm:grid-cols-4 items-start sm:items-center gap-1 sm:gap-4">
            <Label htmlFor="startDate" className="sm:text-right text-sm sm:text-base mb-1 sm:mb-0">
              {t('creation.startDate')}
            </Label>
            <div className="sm:col-span-3">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setFieldErrors(prev => ({ ...prev, startDate: '' }));
                      // Kad je unesena godina (četveroznamenkasta), prebaci fokus na vrijeme početka
                      // Napomena: ovo prati isti obrazac kao i za stvarne datume niže u formi
                      if (parseInt(e.target.value.substring(0, 4), 10) > 1000) {
                        startTimeRef.current?.focus();
                      }
                    }}
                    className={fieldErrors.startDate ? 'border-red-500' : ''}
                  />
                  {fieldErrors.startDate && <p className="text-red-500 text-xs mt-1">{t('creation.validation.startDateRequired')}</p>}
                </div>
                <div className="flex-1">
                  <Input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => {
                      setStartTime(e.target.value);
                      setFieldErrors(prev => ({ ...prev, startTime: '' }));
                    }}
                    className={fieldErrors.startTime ? 'border-red-500' : ''}
                    ref={startTimeRef}
                  />
                  {fieldErrors.startTime && <p className="text-red-500 text-xs mt-1">{t('creation.validation.startTimeRequired')}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Polje za stvarni početak */}
          <div className="grid sm:grid-cols-4 items-start sm:items-center gap-1 sm:gap-4">
            <Label htmlFor="actualStartDate" className="sm:text-right text-sm sm:text-base mb-1 sm:mb-0">
              {t('creation.actualStartDate')}
            </Label>
            <div className="sm:col-span-3 flex flex-wrap sm:flex-nowrap items-center gap-2">
              <Input
                id="actualStartDate"
                type="date"
                value={actualStartDate}
                onChange={e => {
                  // Ako se dodaje stvarni početak, resetirati ručni unos sati
                  if (e.target.value && manualHours) {
                    setManualHours('');
                  }
                  setActualStartDate(e.target.value);
                  // Provjeravamo je li unesena godina četveroznamenkasta prije skoka
                  if (parseInt(e.target.value.substring(0, 4), 10) > 1000) {
                    actualStartTimeRef.current?.focus();
                  }
                }}
                className="w-auto"
                disabled={!!manualHours}
              />
              <Input
                id="actualStartTime"
                type="time"
                ref={actualStartTimeRef}
                value={actualStartTime}
                onChange={e => {
                  // Ako se dodaje stvarni početak, resetirati ručni unos sati
                  if (e.target.value && manualHours) {
                    setManualHours('');
                  }
                  setActualStartTime(e.target.value);
                }}
                className="w-auto"
                disabled={!!manualHours}
              />
              <Button 
                type="button" 
                variant="outline" 
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
            </div>
          </div>

          {/* Polje za stvarni završetak */}
          <div className="grid sm:grid-cols-4 items-start sm:items-center gap-1 sm:gap-4">
            <Label htmlFor="actualEndDate" className="sm:text-right text-sm sm:text-base mb-1 sm:mb-0">
              {t('creation.actualEndDate')}
            </Label>
            <div className="sm:col-span-3 flex flex-wrap sm:flex-nowrap items-center gap-2">
              <Input
                id="actualEndDate"
                type="date"
                value={actualEndDate}
                onChange={e => {
                  // Ako se dodaje stvarni završetak, resetirati ručni unos sati
                  if (e.target.value && manualHours) {
                    setManualHours('');
                  }
                  setActualEndDate(e.target.value);
                  // Provjeravamo je li unesena godina četveroznamenkasta prije skoka
                  if (parseInt(e.target.value.substring(0, 4), 10) > 1000) {
                    actualEndTimeRef.current?.focus();
                  }
                }}
                className="w-auto"
                disabled={!!manualHours}
              />
              <Input
                id="actualEndTime"
                type="time"
                ref={actualEndTimeRef}
                value={actualEndTime}
                onChange={e => {
                  // Ako se dodaje stvarni završetak, resetirati ručni unos sati
                  if (e.target.value && manualHours) {
                    setManualHours('');
                  }
                  setActualEndTime(e.target.value);
                }}
                className="w-auto"
                disabled={!!manualHours}
              />
              <Button
                type="button"
                variant="outline"
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
            </div>
          </div>

          {/* Polje za ručni unos sati */}
          <div className="grid sm:grid-cols-4 items-start sm:items-center gap-1 sm:gap-4">
            <Label htmlFor="manualHours" className="sm:text-right text-sm sm:text-base mb-1 sm:mb-0">
              {t('creation.manualHours')}
            </Label>
            <div className="sm:col-span-3 flex items-center gap-2">
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
            <div className="grid sm:grid-cols-4 items-start sm:items-center gap-1 sm:gap-4">
              <Label htmlFor="recognition_percentage" className="sm:text-right text-sm sm:text-base mb-1 sm:mb-0">
                {t('creation.recognitionPercentage')}
              </Label>
              <div className="sm:col-span-3">
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
          <div className="grid sm:grid-cols-4 items-start gap-1 sm:gap-4">
            <Label className="sm:text-right pt-0 sm:pt-2 text-sm sm:text-base mb-1 sm:mb-0">{t('creation.participants')}</Label>
            <div className="sm:col-span-3">
              {/* Prikazujemo različite komponente ovisno o tipu aktivnosti */}
              {activityTypes.find(type => type.type_id === Number(selectedTypeId))?.key === 'izleti' ? (
                <MemberRoleSelect 
                  selectedMembers={participantsWithRoles} 
                  onSelectionChange={setParticipantsWithRoles} 
                />
              ) : (
                <MemberSelect 
                  selectedMemberIds={participantIds} 
                  onSelectionChange={setParticipantIds} 
                />
              )}
            </div>
          </div>

          {error && (
            <div className="col-span-4 bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-700 text-sm font-medium">{t('error', { ns: 'common' })}</p>
              <p className="text-red-600 text-sm">{t('creation.error')}</p>
            </div>
          )}

          <DialogFooter className="mt-2 sm:mt-4 flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading} className="w-full sm:w-auto text-sm sm:text-base">
              {t('cancel', { ns: 'common' })}
            </Button>
            <Button
              type="button"
              onClick={() => { void handleSubmit(); }}
              disabled={isLoading}
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              {isLoading ? t('saving', { ns: 'common' }) : t('save', { ns: 'common' })}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

export default CreateActivityModal;