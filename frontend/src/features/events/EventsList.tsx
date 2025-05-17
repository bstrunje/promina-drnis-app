import React, { useState, useEffect } from 'react';
import { CalendarDays } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
  location: string;
  capacity: number;
  registeredCount?: number;
}

const EventsList: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/events');
      if (!response.ok) throw new Error('Failed to fetch events');
      
      // Eksplicitno definiramo tip podataka koji očekujemo od API-ja
      const data = await response.json() as Event[];
      
      // Validiramo podatke prije korištenja
      const validatedEvents = data.map(event => ({
        id: typeof event.id === 'number' ? event.id : 0,
        title: typeof event.title === 'string' ? event.title : '',
        description: typeof event.description === 'string' ? event.description : '',
        date: typeof event.date === 'string' ? event.date : '',
        location: typeof event.location === 'string' ? event.location : '',
        capacity: typeof event.capacity === 'number' ? event.capacity : 0,
        registeredCount: typeof event.registeredCount === 'number' ? event.registeredCount : undefined
      }));
      
      setEvents(validatedEvents);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load events';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Upcoming Events</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Create Event
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {events.length > 0 ? (
          <div className="grid gap-4">
            {events.map((event) => (
              <div 
                key={event.id}
                className="border rounded-lg p-4"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">{event.title}</h3>
                    <p className="text-sm text-gray-600">{format(parseISO(event.date), 'dd.MM.yyyy')}</p>
                    <p className="text-sm text-gray-600">{event.location}</p>
                  </div>
                  <div className="text-right">
                    {event.registeredCount !== undefined && (
                      <p className="text-sm text-gray-600">
                        {event.registeredCount}/{event.capacity} registered
                      </p>
                    )}
                  </div>
                </div>
                {event.description && (
                  <p className="mt-2 text-gray-600">{event.description}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-40 text-gray-500">
            <div className="text-center">
              <CalendarDays className="h-12 w-12 mx-auto mb-2" />
              <p>No events scheduled yet</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsList;