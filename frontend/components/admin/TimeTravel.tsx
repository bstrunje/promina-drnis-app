import React, { useState } from 'react';
import axios from 'axios';

const TimeTravel: React.FC = () => {
  const [date, setDate] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  const handleSetDate = async () => {
    if (!date) {
      setMessage('Molimo odaberite datum.');
      return;
    }
    try {
      const response = await axios.post('/api/dev/set-date', { date });
      setMessage(`Vrijeme uspješno postavljeno na: ${response.data.fakeTime}`);
    } catch (error) {
      console.error('Greška prilikom postavljanja datuma:', error);
      setMessage('Greška prilikom postavljanja datuma.');
    }
  };

  const handleResetDate = async () => {
    try {
      await axios.post('/api/dev/reset-date');
      setMessage('Vrijeme uspješno resetirano na stvarno vrijeme.');
      setDate('');
    } catch (error) {
      console.error('Greška prilikom resetiranja datuma:', error);
      setMessage('Greška prilikom resetiranja datuma.');
    }
  };

  return (
    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 my-4 rounded-md shadow-md">
      <h3 className="font-bold text-lg mb-2">Putovanje kroz vrijeme (Samo za razvoj)</h3>
      <p className="text-sm mb-4">Ovaj alat omogućuje simulaciju različitih datuma kako bi se testirale funkcionalnosti ovisne o vremenu, poput isteka članarina.</p>
      <div className="flex items-center space-x-4">
        <input
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="p-2 border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
        />
        <button
          onClick={handleSetDate}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-300"
        >
          Postavi Datum
        </button>
        <button
          onClick={handleResetDate}
          className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition duration-300"
        >
          Resetiraj Vrijeme
        </button>
      </div>
      {message && <p className="mt-4 text-sm font-medium">{message}</p>}
    </div>
  );
};

export default TimeTravel;
