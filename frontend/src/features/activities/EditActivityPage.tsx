import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getActivityById, updateActivity } from '../../utils/api/apiActivities';
import { Activity } from '@shared/activity.types';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Input } from '@components/ui/input';
import { Textarea } from '@components/ui/textarea';
import { Label } from '@components/ui/label';
import { useToast } from '@components/ui/use-toast';

const EditActivityPage: React.FC = () => {
  const { activityId } = useParams<{ activityId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activity, setActivity] = useState<Partial<Activity>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      if (!activityId) return;
      try {
        setLoading(true);
        const data = await getActivityById(activityId);
        setActivity(data);
      } catch (err) {
        toast({ title: 'Greška', description: 'Nije moguće dohvatiti podatke o aktivnosti.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    fetchActivity();
  }, [activityId, toast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setActivity(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityId) return;

    const dataToUpdate = {
        name: activity.name,
        description: activity.description,
        start_date: activity.start_date
    };

    try {
      await updateActivity(Number(activityId), dataToUpdate);
      toast({ title: 'Uspjeh', description: 'Aktivnost je uspješno ažurirana.' });
      navigate(`/activities/${activityId}`);
    } catch (error) {
      toast({ title: 'Greška', description: 'Nije moguće ažurirati aktivnost.', variant: 'destructive' });
    }
  };

  if (loading) return <div>Učitavanje...</div>;

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Uredi aktivnost</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4">
              <div>
                <Label htmlFor="name">Naziv aktivnosti</Label>
                <Input id="name" name="name" value={activity.name || ''} onChange={handleChange} required />
              </div>
              <div>
                <Label htmlFor="description">Opis</Label>
                <Textarea id="description" name="description" value={activity.description || ''} onChange={handleChange} />
              </div>
               <div>
                <Label htmlFor="start_date">Datum i vrijeme početka</Label>
                <Input id="start_date" name="start_date" type="datetime-local" value={activity.start_date ? new Date(activity.start_date).toISOString().substring(0, 16) : ''} onChange={handleChange} required />
              </div>
              <div className="flex justify-end gap-2">
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
