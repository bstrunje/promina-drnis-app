import React, { useEffect, useState } from 'react';
import { createActivityAdmin, getAllActivitiesAdmin, getActivityTypes } from '../../utils/api/apiActivities';
import { Activity, ActivityStatus, ActivityType } from '@shared/activity.types';
import { useAuth } from '../../context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@components/ui/dialog';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Textarea } from '@components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select';

const ActivitiesAdminPage: React.FC = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newActivity, setNewActivity] = useState({
    name: '',
    description: '',
    start_date: '',
    type_id: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [activitiesData, typesData] = await Promise.all([
          getAllActivitiesAdmin(),
          getActivityTypes(),
        ]);
        setActivities(activitiesData);
        setActivityTypes(typesData);
        setError(null);
      } catch (err) {
        setError('Greška prilikom dohvaćanja podataka.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewActivity((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setNewActivity((prev) => ({ ...prev, type_id: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('Korisnik nije prijavljen.');
      return;
    }

    try {
      const activityToCreate: Omit<Activity, 'activity_id' | 'created_at' | 'updated_at'> = {
        name: newActivity.name,
        description: newActivity.description || null,
        type_id: parseInt(newActivity.type_id, 10),
        organizer_id: user.member_id,
        status: ActivityStatus.PLANNED,
        start_date: new Date(newActivity.start_date),
        actual_start_time: null,
        actual_end_time: null,
        recognition_percentage: 100,
        cancellation_reason: null,
      };

      const created = await createActivityAdmin(activityToCreate);
      setActivities((prev) => [...prev, created]);
      setIsModalOpen(false);
      // Reset form
      setNewActivity({
        name: '', description: '', start_date: '', type_id: '',
      });
    } catch (err) {
      setError('Greška prilikom kreiranja aktivnosti.');
      console.error(err);
    }
  };

  if (loading) {
    return <div className="container mx-auto p-4">Učitavanje...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Administracija aktivnosti</h1>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button>Dodaj novu aktivnost</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova aktivnost</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Naziv</Label>
                <Input id="name" name="name" value={newActivity.name} onChange={handleInputChange} required />
              </div>
              <div>
                <Label htmlFor="description">Opis</Label>
                <Textarea id="description" name="description" value={newActivity.description} onChange={handleInputChange} />
              </div>
              <div>
                <Label htmlFor="type_id">Tip aktivnosti</Label>
                <Select onValueChange={handleSelectChange} value={newActivity.type_id} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Odaberite tip" />
                  </SelectTrigger>
                  <SelectContent>
                    {activityTypes.map((type) => (
                      <SelectItem key={type.type_id} value={String(type.type_id)}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="start_date">Datum početka</Label>
                <Input id="start_date" name="start_date" type="datetime-local" value={newActivity.start_date} onChange={handleInputChange} required />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Odustani</Button>
                <Button type="submit">Spremi</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b">Naziv</th>
              <th className="py-2 px-4 border-b">Datum početka</th>
              <th className="py-2 px-4 border-b">Status</th>
              <th className="py-2 px-4 border-b">Akcije</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((activity) => (
              <tr key={activity.activity_id}>
                <td className="py-2 px-4 border-b">{activity.name}</td>
                <td className="py-2 px-4 border-b">{new Date(activity.start_date).toLocaleString()}</td>
                <td className="py-2 px-4 border-b">{activity.status}</td>
                <td className="py-2 px-4 border-b">
                  <button className="text-blue-500 hover:underline mr-2">Uredi</button>
                  <button className="text-red-500 hover:underline">Obriši</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ActivitiesAdminPage;