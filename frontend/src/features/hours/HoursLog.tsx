import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
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
  const [hours, setHours] = useState<LoggedHours[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHours();
  }, []);

  const fetchHours = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/hours');
      if (!response.ok) throw new Error('Failed to fetch hours');
      const data = await response.json();
      setHours(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load hours');
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
        <h1 className="text-2xl font-bold">Hours Log</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Log Hours
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {hours.length > 0 ? (
          <div className="grid gap-4">
            {hours.map((log) => (
              <div 
                key={log.id}
                className="border rounded-lg p-4"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">{log.activity_name}</h3>
                    <p className="text-sm text-gray-600">{new Date(log.date).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{log.hours} hours</span>
                    {log.verified && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        Verified
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-40 text-gray-500">
            <div className="text-center">
              <Clock className="h-12 w-12 mx-auto mb-2" />
              <p>No hours logged yet</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HoursLog;