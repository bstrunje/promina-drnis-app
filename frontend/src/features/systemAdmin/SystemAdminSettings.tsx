// features/systemAdmin/SystemAdminSettings.tsx
import React, { useState, useEffect } from 'react';
import { Shield, RefreshCw, Save } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../utils/config';
import { useSystemAdmin } from '../../context/SystemAdminContext';
import { useTimeZone } from '../../context/TimeZoneContext'; // Dodana linija
import { SystemSettings } from '@shared/settings.types';
import { getCurrentDate } from '../../utils/dateUtils';

interface SystemSettingsFormProps {
  settings: SystemSettings;
  isLoading: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

// Izdvojeni formular za bolje organiziran kod
const SystemSettingsForm: React.FC<SystemSettingsFormProps> = ({
  settings,
  isLoading,
  onChange,
  onSubmit
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Osnovne postavke sustava</h2>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Duljina broja članske iskaznice
          </label>
          <input
            type="number"
            name="cardNumberLength"
            min="1"
            max="10"
            value={settings.cardNumberLength}
            onChange={onChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
          <p className="text-sm text-gray-500 mt-1">
            Definira duljinu brojeva članskih iskaznica.
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Datum obnove članstva
          </label>
          <div className="flex space-x-4">
            <div>
              <label
                htmlFor="renewalStartDay"
                className="block text-sm font-medium text-gray-700"
              >
                Dan
              </label>
              <input
                type="number"
                name="renewalStartDay"
                className="mt-1 block w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Dan"
                min="1"
                max="31"
                value={settings.renewalStartDay}
                onChange={onChange}
              />
            </div>
            <div>
              <label
                htmlFor="renewalStartMonth"
                className="block text-sm font-medium text-gray-700"
              >
                Mjesec
              </label>
              <select
                name="renewalStartMonth"
                className="mt-1 block w-36 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={settings.renewalStartMonth}
                onChange={onChange}
              >
                <option value={11}>Prosinac</option>
                <option value={10}>Studeni</option>
              </select>
            </div>
          </div>
          <div className="mt-2 space-y-2">
            <p className="text-sm text-gray-500">
              Postavlja granični datum za obradu obnove članstva.
            </p>
            <p className="text-sm text-blue-600">
              Ako je uplata primljena nakon ovog datuma, članstvo počinje od 1. siječnja sljedeće godine.
            </p>
            <p className="text-sm text-blue-600">
              Ako je uplata primljena prije ili na ovaj datum, članstvo počinje odmah.
            </p>
          </div>
        </div>

        {/* Dodana kontrola za vremensku zonu */}
        <div className="mt-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vremenska zona sustava
          </label>
          <div className="flex space-x-4">
            <div className="w-full">
              <select
                name="timeZone"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={settings.timeZone || 'Europe/Zagreb'}
                onChange={onChange}
              >
                <option value="Europe/Zagreb">Zagreb (UTC+1/UTC+2)</option>
                <option value="Europe/Belgrade">Beograd (UTC+1/UTC+2)</option>
                <option value="Europe/Berlin">Berlin (UTC+1/UTC+2)</option>
                <option value="Europe/London">London (UTC+0/UTC+1)</option>
                <option value="UTC">UTC (Koordinirano svjetsko vrijeme)</option>
                <option value="Europe/Athens">Atena (UTC+2/UTC+3)</option>
                <option value="Europe/Kiev">Kijev (UTC+2/UTC+3)</option>
                <option value="Europe/Moscow">Moskva (UTC+3)</option>
                <option value="Asia/Dubai">Dubai (UTC+4)</option>
                <option value="Asia/Bangkok">Bangkok (UTC+7)</option>
                <option value="Asia/Tokyo">Tokio (UTC+9)</option>
                <option value="America/New_York">New York (UTC-5/UTC-4)</option>
                <option value="America/Chicago">Chicago (UTC-6/UTC-5)</option>
                <option value="America/Los_Angeles">Los Angeles (UTC-8/UTC-7)</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Ova postavka utječe na prikazivanje datuma i vremena u cijeloj aplikaciji.
              </p>
              <div className="mt-1 text-xs text-blue-600">
                Vremenske zone prikazuju se s njihovim pomakom od UTC (standardno/ljetno).
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Sigurnosne postavke</h2>
        
        <div className="text-sm text-gray-500 py-2">
          <p>U budućim verzijama će biti dostupne dodatne sigurnosne postavke:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Postavke dvostruke autentifikacije</li>
            <li>Pravila kompleksnosti lozinke</li>
            <li>Postavke sesija</li>
            <li>Autorizacijska pravila</li>
          </ul>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Postavke sigurnosnih kopija</h2>
        
        <div className="text-sm text-gray-500 py-2">
          <p>U budućim verzijama će biti dostupne postavke sigurnosnih kopija:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Učestalost kreiranja automatskih sigurnosnih kopija</li>
            <li>Lokacija pohrane</li>
            <li>Postavke zadržavanja</li>
          </ul>
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <button
          type="submit"
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Spremanje...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Spremi postavke
            </>
          )}
        </button>
      </div>
    </form>
  );
};

const SystemAdminSettings: React.FC = () => {
  const { admin } = useSystemAdmin();
  const { refreshTimeZone } = useTimeZone(); // Dodana linija
  const [settings, setSettings] = useState<SystemSettings>({
    id: "default",
    cardNumberLength: 5,
    renewalStartMonth: 11, // Prosinac kao zadana vrijednost
    renewalStartDay: 31,
    timeZone: 'Europe/Zagreb', // Dodana zadana vremenska zona
    updatedAt: getCurrentDate(),
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Učitaj postavke pri inicijalizaciji komponente
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('systemAdminToken');
        const response = await axios.get(`${API_BASE_URL}/system-admin/settings`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        setSettings(response.data);
      } catch (err) {
        const errorMessage = axios.isAxiosError(err)
          ? err.response?.data?.message || err.message
          : 'Dogodila se nepoznata greška';
        setError(`Greška prilikom dohvata postavki: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Obrada promjene vrijednosti u poljima
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'renewalStartDay') {
      const numValue = parseInt(value);
      if (numValue < 1 || numValue > 31) {
        setError('Dan obnove mora biti između 1 i 31');
        return;
      }
      
      setSettings(prev => ({
        ...prev,
        [name]: numValue
      }));
    } 
    else if (name === 'cardNumberLength') {
      const numValue = parseInt(value);
      if (numValue < 1 || numValue > 10) {
        setError('Duljina broja iskaznice mora biti između 1 i 10');
        return;
      }
      
      setSettings(prev => ({
        ...prev,
        [name]: numValue
      }));
    }
    else if (name === 'renewalStartMonth') {
      setSettings(prev => ({
        ...prev,
        [name]: parseInt(value)
      }));
    }
    else if (name === 'timeZone') {
      setSettings(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    setError(null);
  };

  // Spremanje postavki
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = localStorage.getItem('systemAdminToken');
      const response = await axios.put(`${API_BASE_URL}/system-admin/settings`, settings, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data) {
        setSettings(response.data);
        setSuccessMessage("Postavke su uspješno ažurirane!");
        
        // Osvježi vremensku zonu u kontekstu
        refreshTimeZone();
        
        // Automatski sakrij poruku uspjeha nakon 8 sekundi
        setTimeout(() => {
          setSuccessMessage(null);
        }, 8000);
      }
    } catch (err) {
      const errorMessage = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : 'Dogodila se nepoznata greška';
      setError(`Greška prilikom ažuriranja postavki: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-800">System Admin Panel</h1>
          </div>
          <div className="text-sm text-gray-600">
            Prijavljeni kao: <span className="font-medium">{admin?.display_name}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-lg text-white p-6 mb-6">
          <h1 className="text-2xl font-bold mb-2">Postavke sustava</h1>
          <p className="opacity-90">Konfiguracija sistemskih parametara</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-6">
            <span className="block sm:inline">{successMessage}</span>
          </div>
        )}

        <SystemSettingsForm 
          settings={settings}
          isLoading={isLoading}
          onChange={handleChange}
          onSubmit={handleSubmit}
        />
      </main>
    </div>
  );
};

export default SystemAdminSettings;
