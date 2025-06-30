import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getActivityById, updateActivity } from '../../utils/api/apiActivities';
import { Activity } from '@shared/activity.types';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Input } from '@components/ui/input';
import { Textarea } from '@components/ui/textarea';
import { Label } from '@components/ui/label';
import { useToast } from '@components/ui/use-toast';
import { format, parseISO } from 'date-fns';
import { Clock } from 'lucide-react';
import { MemberSelect } from './MemberSelect';

const EditActivityPage: React.FC = () => {
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
        setName(data.name || '');
        setDescription(data.description || '');

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

        setParticipantIds(data.participants?.map(p => p.member.member_id.toString()) || []);

      } catch (err) {
        toast({ title: 'Greška', description: 'Nije moguće dohvatiti podatke o aktivnosti.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    fetchActivity();
  }, [activityId, toast]);

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
        toast({ title: 'Greška', description: 'Naziv i datum početka su obavezni.', variant: 'destructive' });
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
        participant_ids: participantIds.map(id => Number(id)),
        // Dodajemo manual_hours za ažuriranje - backend će ga primijeniti na sve sudionike
        manual_hours: manualHours ? Number(manualHours) : null,
    };

    try {
      await updateActivity(Number(activityId), dataToUpdate);
      toast({ title: 'Uspjeh', description: 'Aktivnost je uspješno ažurirana.' });
      navigate(`/activities/details/${activityId}`);
    } catch (error) {
      toast({ title: 'Greška', description: 'Nije moguće ažurirati aktivnost.', variant: 'destructive' });
    }
  };

  if (loading) return <div className="container mx-auto p-4">Učitavanje...</div>;

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Uredi aktivnost</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-6">
              <div>
                <Label htmlFor="name">Naziv aktivnosti</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="description">Opis</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>

              {/* Polje za datum početka */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="startDate" className="text-right">Datum početka</Label>
                <div className="col-span-3 flex items-center gap-2">
                  <Input id="startDate" type="date" value={startDate} onChange={e => { setStartDate(e.target.value); if (parseInt(e.target.value.substring(0, 4), 10) > 1000) startTimeRef.current?.focus(); }} required />
                  <Input id="startTime" type="time" ref={startTimeRef} value={startTime} onChange={e => setStartTime(e.target.value)} required />
                  <Button type="button" variant="outline" size="icon" onClick={() => handleSetNow(setStartDate, setStartTime)}><Clock className="h-4 w-4" /></Button>
                </div>
              </div>

              {/* Polje za stvarni početak */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="actualStartDate" className="text-right">Stvarni početak</Label>
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
                      if (parseInt(e.target.value.substring(0, 4), 10) > 1000) actualStartTimeRef.current?.focus();
                    }} 
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
                <Label htmlFor="actualEndDate" className="text-right">Stvarni završetak</Label>
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
                      if (parseInt(e.target.value.substring(0, 4), 10) > 1000) actualEndTimeRef.current?.focus(); 
                    }} 
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
                <Label htmlFor="manualHours" className="text-right">Ručni unos sati</Label>
                <div className="col-span-3">
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

              {/* Odabir sudionika */}
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">Sudionici</Label>
                <div className="col-span-3">
                  <MemberSelect selectedMemberIds={participantIds} onSelectionChange={setParticipantIds} />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                 <Button type="button" variant="outline" onClick={() => navigate(-1)}>Odustani</Button>
                <Button type="submit">Spremi promjene</Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditActivityPage;
