import React, { useState, useRef, useEffect } from 'react';
import { createActivity, getActivityTypes } from '@/utils/api/apiActivities';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@components/ui/dialog';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@components/ui/select';
import { useToast } from '@components/ui/use-toast';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import RecognitionPercentageInput from '@components/RecognitionPercentageInput';
import { MemberSelect } from './MemberSelect';
import { ActivityType } from '@shared/activity.types';

interface CreateActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivityCreated: () => void;
  activityTypeId: string | null;
}

const CreateActivityModal: React.FC<CreateActivityModalProps> = ({ isOpen, onClose, onActivityCreated, activityTypeId }) => {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [actualStartDate, setActualStartDate] = useState('');
  const [actualStartTime, setActualStartTime] = useState('');
  const [actualEndDate, setActualEndDate] = useState('');
  const [actualEndTime, setActualEndTime] = useState('');
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [recognitionPercentage, setRecognitionPercentage] = useState('100');
  const [manualHours, setManualHours] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Dodajemo stanje za tipove aktivnosti i odabrani tip
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string>(activityTypeId || '');
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
          
          // Ako nije prethodno odabran tip, postavi prvi kao defaultni
          if (!selectedTypeId && types.length > 0) {
            setSelectedTypeId(String(types[0].type_id));
          }
        } catch (err) {
          console.error('Greška prilikom dohvaćanja tipova aktivnosti:', err);
          setError('Nije uspjelo dohvaćanje tipova aktivnosti.');
        } finally {
          setLoadingTypes(false);
        }
      };
      
      void fetchActivityTypes();
    }
  }, [isOpen, selectedTypeId]);

  const handleSetNow = (
    dateSetter: React.Dispatch<React.SetStateAction<string>>,
    timeSetter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const now = new Date();
    dateSetter(format(now, 'yyyy-MM-dd'));
    timeSetter(format(now, 'HH:mm'));
  };

  const handleSubmit = async () => {
    if (!description || !startDate || !startTime || !selectedTypeId) {
      setError('Opis, datum početka i tip aktivnosti su obavezni.');
      return;
    }
    setIsLoading(true);
    setError(null);

    const activityName = description.length > 20 ? `${description.substring(0, 20)}...` : description;

    const combinedStartDate = `${startDate}T${startTime}`;
    const combinedActualStartTime = actualStartDate && actualStartTime ? `${actualStartDate}T${actualStartTime}` : null;
    const combinedActualEndTime = actualEndDate && actualEndTime ? `${actualEndDate}T${actualEndTime}` : null;

    try {
      await createActivity({
        name: activityName,
        description,
        start_date: new Date(combinedStartDate),
        // Ako su uneseni ručni sati, ne šaljemo stvarna vremena
        actual_start_time: manualHours ? null : (combinedActualStartTime ? new Date(combinedActualStartTime) : null),
        actual_end_time: manualHours ? null : (combinedActualEndTime ? new Date(combinedActualEndTime) : null),
        activity_type_id: Number(selectedTypeId),
        recognition_percentage: Number(recognitionPercentage),
        participant_ids: participantIds.map(id => Number(id)),
      });
      toast({ title: 'Uspjeh', description: 'Aktivnost je uspješno kreirana.' });
      onActivityCreated();
      // Reset form
      setDescription('');
      setStartDate('');
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
      console.error('Greška prilikom kreiranja aktivnosti:', err);
      setError('Nije uspjelo kreiranje aktivnosti. Pokušajte ponovno.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Kreiraj novu aktivnost</DialogTitle>
          <DialogDescription>Ispunite detalje za novu aktivnost.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Odabir tipa aktivnosti */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="activityType" className="text-right">
              Tip aktivnosti
            </Label>
            <div className="col-span-3">
              <Select value={selectedTypeId} onValueChange={setSelectedTypeId} disabled={loadingTypes}>
                <SelectTrigger id="activityType">
                  <SelectValue placeholder="Odaberite tip aktivnosti" />
                </SelectTrigger>
                <SelectContent>
                  {activityTypes.map((type) => (
                    <SelectItem key={type.type_id} value={String(type.type_id)}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {loadingTypes && <p className="text-sm text-muted-foreground mt-1">Učitavanje tipova aktivnosti...</p>}
            </div>
          </div>
            
          {/* Opis aktivnosti */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Opis
            </Label>
            <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" required />
          </div>

          {/* Polje za datum početka */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="startDate" className="text-right">
              Datum početka
            </Label>
            <div className="col-span-3 flex items-center gap-2">
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  // Provjeravamo je li unesena godina četveroznamenkasta prije skoka
                  if (parseInt(e.target.value.substring(0, 4), 10) > 1000) {
                    startTimeRef.current?.focus();
                  }
                }}
                className="w-auto"
                required
              />
              <Input
                id="startTime"
                type="time"
                ref={startTimeRef}
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-auto"
                required
              />
              <Button type="button" variant="outline" size="icon" onClick={() => handleSetNow(setStartDate, setStartTime)}>
                <Clock className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Polje za stvarni početak */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="actualStartDate" className="text-right">
              Stvarni početak
            </Label>
            <div className="col-span-3 flex items-center gap-2">
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
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="actualEndDate" className="text-right">
              Stvarni završetak
            </Label>
            <div className="col-span-3 flex items-center gap-2">
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
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="manualHours" className="text-right">
              Ručni unos sati
            </Label>
            <div className="col-span-3 flex items-center gap-2">
              <Input
                id="manualHours"
                type="number"
                min="0"
                step="0.5"
                placeholder="Npr. 2.5 za 2 sata i 30 minuta"
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

          {/* Postotak priznavanja */}
          {user?.role === 'member_superuser' && (
            <RecognitionPercentageInput
              value={recognitionPercentage}
              onChange={e => setRecognitionPercentage(e.target.value)}
            />
          )}

          {/* Odabir sudionika */}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">Sudionici</Label>
            <div className="col-span-3">
              <MemberSelect selectedMemberIds={participantIds} onSelectionChange={setParticipantIds} />
            </div>
          </div>

          {error && <p className="col-span-4 text-red-500 text-sm">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
              Odustani
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? 'Spremanje...' : 'Spremi'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateActivityModal;