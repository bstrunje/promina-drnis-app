import React, { useState, useRef } from 'react';
import { createActivity } from '@/utils/api/apiActivities';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@components/ui/dialog';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { useToast } from '@components/ui/use-toast';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import RecognitionPercentageInput from '@components/RecognitionPercentageInput';
import { MemberSelect } from './MemberSelect';

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const startTimeRef = useRef<HTMLInputElement>(null);
  const actualStartTimeRef = useRef<HTMLInputElement>(null);
  const actualEndTimeRef = useRef<HTMLInputElement>(null);

  const handleSetNow = (
    dateSetter: React.Dispatch<React.SetStateAction<string>>,
    timeSetter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const now = new Date();
    dateSetter(format(now, 'yyyy-MM-dd'));
    timeSetter(format(now, 'HH:mm'));
  };

  const handleSubmit = async () => {
    if (!description || !startDate || !startTime || !activityTypeId) {
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
        actual_start_time: combinedActualStartTime ? new Date(combinedActualStartTime) : null,
        actual_end_time: combinedActualEndTime ? new Date(combinedActualEndTime) : null,
        activity_type_id: Number(activityTypeId),
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
                  setActualStartDate(e.target.value);
                  // Provjeravamo je li unesena godina četveroznamenkasta prije skoka
                  if (parseInt(e.target.value.substring(0, 4), 10) > 1000) {
                    actualStartTimeRef.current?.focus();
                  }
                }}
                className="w-auto"
              />
              <Input
                id="actualStartTime"
                type="time"
                ref={actualStartTimeRef}
                value={actualStartTime}
                onChange={e => setActualStartTime(e.target.value)}
                className="w-auto"
              />
              <Button type="button" variant="outline" size="icon" onClick={() => handleSetNow(setActualStartDate, setActualStartTime)}>
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
                  setActualEndDate(e.target.value);
                  // Provjeravamo je li unesena godina četveroznamenkasta prije skoka
                  if (parseInt(e.target.value.substring(0, 4), 10) > 1000) {
                    actualEndTimeRef.current?.focus();
                  }
                }}
                className="w-auto"
              />
              <Input
                id="actualEndTime"
                type="time"
                ref={actualEndTimeRef}
                value={actualEndTime}
                onChange={e => setActualEndTime(e.target.value)}
                className="w-auto"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleSetNow(setActualEndDate, setActualEndTime)}
              >
                <Clock className="h-4 w-4" />
              </Button>
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