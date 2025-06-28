import React, { useState } from 'react';
import { createActivity } from '@/utils/api/apiActivities';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@components/ui/dialog';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Textarea } from '@components/ui/textarea';
import { useToast } from '@components/ui/use-toast';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';

interface CreateActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivityCreated: () => void;
  activityTypeId?: number;
}

const CreateActivityModal: React.FC<CreateActivityModalProps> = ({ isOpen, onClose, onActivityCreated, activityTypeId }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [actualStartTime, setActualStartTime] = useState('');
  const [actualEndTime, setActualEndTime] = useState('');
  const [recognitionPercentage, setRecognitionPercentage] = useState('100');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const now = format(new Date(), "yyyy-MM-dd'T'HH:mm");

  const handleSetNow = (setter: React.Dispatch<React.SetStateAction<string>>) => {
    setter(now);
  };

  const handleSubmit = async () => {
    if (!name || !startDate || !activityTypeId) {
      setError('Naziv, datum početka i tip aktivnosti su obavezni.');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      await createActivity({
        name,
        description,
        start_date: new Date(startDate),
        actual_start_time: actualStartTime ? new Date(actualStartTime) : null,
        actual_end_time: actualEndTime ? new Date(actualEndTime) : null,
        activity_type_id: Number(activityTypeId),
        recognition_percentage: Number(recognitionPercentage),
      });
      toast({
        title: 'Uspjeh',
        description: 'Aktivnost je uspješno kreirana.',
        variant: 'success',
      });
      onActivityCreated();
      setName('');
      setDescription('');
      setStartDate('');
      setActualStartTime('');
      setActualEndTime('');
      setRecognitionPercentage('100');
      onClose(); // Zatvori modal nakon uspješnog kreiranja
    } catch (err) {
      console.error('Greška prilikom kreiranja aktivnosti:', err);
      setError('Nije uspjelo kreiranje aktivnosti. Pokušajte ponovno.');
      toast({
        title: 'Greška',
        description: 'Nije uspjelo kreiranje aktivnosti. Pokušajte ponovno.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kreiraj novu aktivnost</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => e.preventDefault()} className="space-y-4 py-4">
          <div>
            <Label htmlFor="name">Naziv</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="description">Opis</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          
          {/* Polje za datum početka */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="startDate" className="text-right">
              Datum početka
            </Label>
            <div className="col-span-3 flex items-center gap-2">
              <Input
                id="startDate"
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="col-span-3"
              />
              <Button type="button" variant="outline" size="icon" onClick={() => handleSetNow(setStartDate)} className="mt-6">
                <Clock className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Polje za stvarni početak */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="actualStartTime" className="text-right">
              Stvarni početak
            </Label>
            <div className="col-span-3 flex items-center gap-2">
              <Input
                id="actualStartTime"
                type="datetime-local"
                value={actualStartTime}
                onChange={(e) => setActualStartTime(e.target.value)}
                className="col-span-3"
              />
              <Button type="button" variant="outline" size="icon" onClick={() => handleSetNow(setActualStartTime)}>
                <Clock className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Polje za stvarni završetak */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="actualEndTime" className="text-right">
              Stvarni završetak
            </Label>
            <div className="col-span-3 flex items-center gap-2">
              <Input
                id="actualEndTime"
                type="datetime-local"
                value={actualEndTime}
                onChange={(e) => setActualEndTime(e.target.value)}
                className="col-span-3"
              />
              <Button type="button" variant="outline" size="icon" onClick={() => handleSetNow(setActualEndTime)}>
                <Clock className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Postotak priznavanja */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="recognitionPercentage" className="text-right">
              Priznavanje (%)
            </Label>
            <div className="col-span-3">
              <Input
                id="recognitionPercentage"
                type="number"
                value={recognitionPercentage}
                onChange={(e) => setRecognitionPercentage(e.target.value)}
                required
                min="0"
                max="100"
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
              Odustani
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? 'Spremanje...' : 'Spremi'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateActivityModal;
