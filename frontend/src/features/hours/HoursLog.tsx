// frontend/src/features/hours/HoursLog.tsx
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription } from '@components/ui/alert';

interface LoggedHours {
  id: number;
  activity_id: number;
  date: string;
  hours: number;
  activity_name: string;
  verified: boolean;
}

const HoursLog: React.FC = () => {
  const { t } = useTranslation();
  const [hours, setHours] = useState<LoggedHours[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchHours();
  }, []);

  const fetchHours = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }
      const response = await fetch('/api/hours', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch hours');
      // Eksplicitno definiramo tip podataka koji očekujemo od API-ja
      const data = await response.json() as LoggedHours[];
      
      // Validiramo podatke prije korištenja
      const validatedHours = data.map(hour => ({
        id: typeof hour.id === 'number' ? hour.id : 0,
        activity_id: typeof hour.activity_id === 'number' ? hour.activity_id : 0,
        date: typeof hour.date === 'string' ? hour.date : '',
        hours: typeof hour.hours === 'number' ? hour.hours : 0,
        activity_name: typeof hour.activity_name === 'string' ? hour.activity_name : '',
        verified: typeof hour.verified === 'boolean' ? hour.verified : false
      }));
      
      setHours(validatedHours);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load hours';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('hoursLog.title')}</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          {t('hoursLog.logHours')}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {hours.length > 0 ? (
          <div className="grid gap-4">
            {hours.map((log) => (
              <div key={log.id} className="border rounded-lg p-4">
                <h3 className="font-medium">{log.activity_name}</h3>
                <p className="text-gray-600">{log.date}</p>
                <p className="text-gray-600">{log.hours} {t('hoursLog.hours')}</p>
                <p className="text-gray-600">{log.verified ? t('hoursLog.verified') : t('hoursLog.notVerified')}</p>
              </div>
            ))}
          </div>
        ) : (
          <p>{t('hoursLog.noHoursLogged')}</p>
        )}
      </div>
    </div>
  );
};

export default HoursLog;