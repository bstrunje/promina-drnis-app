// features/systemAdmin/pages/settings/SystemAdminSettings.tsx
import React, { useState, useEffect } from 'react';
import { Shield, RefreshCw, Save } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../../../utils/config';
import { useSystemAdmin } from '../../../../context/SystemAdminContext';
import { useTimeZone } from '../../../../context/TimeZoneContext'; // Dodana linija
import { SystemSettings } from '@shared/settings';
import { getCurrentDate } from '../../../../utils/dateUtils';
import systemAdminApi, { updateSystemSettings } from '../../utils/systemAdminApi';

interface SystemSettingsFormProps {
  settings: SystemSettings;
  isLoading: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function ChangePasswordForm() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [message, setMessage] = useState('');
  const { admin, refreshAdmin } = useSystemAdmin();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage('');
    let usernameChanged = false;
    try {
      if (newUsername && newUsername !== admin?.username) {
        await systemAdminApi.patch('/system-admin/change-username', { newUsername });
        usernameChanged = true;
        await refreshAdmin(); // automatski osvježi username u UI
      }
      if (oldPassword && newPassword) {
        if (newPassword !== confirm) {
          setMessage('Nova lozinka i potvrda nisu iste.');
          return;
        }
        await systemAdminApi.patch('/system-admin/change-password', { oldPassword, newPassword });
      }
      setMessage(
        (usernameChanged ? 'Username uspješno promijenjen. ' : '') +
        (oldPassword && newPassword ? 'Lozinka uspješno promijenjena.' : '')
      );
      setOldPassword('');
      setNewPassword('');
      setConfirm('');
      setNewUsername('');
    } catch (err: unknown) {
      // Sigurna provjera tipa errora
      if (axios.isAxiosError(err)) {
        // Provjera da err.response.data postoji i da ima message tipa string
const data = err.response?.data as unknown;
const serverMsg = (typeof data === 'object' && data !== null && 'message' in data && typeof (data as { message?: unknown }).message === 'string')
  ? (data as { message: string }).message
  : undefined;
        setMessage(serverMsg ?? 'Greška pri spremanju promjena.');
      } else if (err instanceof Error) {
        setMessage(typeof err.message === 'string' ? err.message : 'Greška pri spremanju promjena.');
      } else {
        setMessage('Greška pri spremanju promjena.');
      }
    }
  };

  return (
    <form onSubmit={e => void handleSubmit(e)} className="max-w-md mx-auto flex flex-col gap-4 bg-white p-6 rounded shadow"> // void zbog lint pravila
      <label htmlFor="newUsername" className="font-medium">Novi username (opcionalno)</label>
      <input
        id="newUsername"
        type="text"
        autoComplete="username"
        className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={newUsername}
        onChange={e => setNewUsername(e.target.value)}
        placeholder={admin?.username ?? 'Trenutni username'}
      />
      <label htmlFor="oldPassword" className="font-medium">Stara lozinka</label>
      {/* Skriveno polje za username radi accessibility i browser autofill */}
      <input
        type="text"
        name="username"
        autoComplete="username"
        value={admin?.username ?? ''}
        style={{ display: 'none' }}
        readOnly
        tabIndex={-1}
        aria-hidden="true"
      />
      <input
        id="oldPassword"
        type="password"
        autoComplete="current-password"
        className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={oldPassword}
        onChange={e => setOldPassword(e.target.value)}
        required={!!(newPassword || confirm)}
      />
      <label htmlFor="newPassword" className="font-medium">Nova lozinka</label>
      <input
        id="newPassword"
        type="password"
        autoComplete="new-password"
        className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={newPassword}
        onChange={e => setNewPassword(e.target.value)}
        required={!!oldPassword}
      />
      <label htmlFor="confirmPassword" className="font-medium">Potvrdi novu lozinku</label>
      <input
        id="confirmPassword"
        type="password"
        autoComplete="new-password"
        className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={confirm}
        onChange={e => setConfirm(e.target.value)}
        required={!!oldPassword}
      />
      <button
        type="submit"
        className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors"
      >
        Spremi promjene
      </button>
      {message && <div className={`mt-2 text-sm ${message.includes('uspješno') ? 'text-green-600' : 'text-red-600'}`}>{message}</div>}
    </form>
  );
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
                value={settings.timeZone ?? 'Europe/Zagreb'} // prefer-nullish-coalescing
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
    membershipFee: 0, // Dodano zbog tipa SystemSettings
    paymentDueMonths: 12, // Dodano zbog tipa SystemSettings
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
        if (typeof response.data === 'object' && response.data !== null) {
          setSettings(response.data as SystemSettings);
        } else {
          setError('Neispravan odgovor servera.');
        }
      } catch (err: unknown) {
        let errorMessage: string;
        if (axios.isAxiosError(err)) {
          // Provjera da err.response.data postoji i da ima message tipa string
          const data = err.response?.data as unknown;
          errorMessage = (typeof data === 'object' && data !== null && 'message' in data && typeof (data as { message?: unknown }).message === 'string')
            ? (data as { message: string }).message
            : err.message;
        } else if (err instanceof Error) {
          errorMessage = typeof err.message === 'string' ? err.message : 'Dogodila se nepoznata greška';
        } else {
          errorMessage = 'Dogodila se nepoznata greška';
        }
        setError(`Greška prilikom dohvata postavki: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    };

    void loadSettings(); // void zbog lint pravila
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
      // Korištenje centralizirane API funkcije za ažuriranje postavki sustava
      const updatedSettings = await updateSystemSettings(settings);
      setSettings(updatedSettings);
      setSuccessMessage("Postavke su uspješno ažurirane!");
      
      // Osvježi vremensku zonu u kontekstu
      void refreshTimeZone(); // void zbog lint pravila
      
      // Automatski sakrij poruku uspjeha nakon 8 sekundi
      void setTimeout(() => {
        setSuccessMessage(null);
      }, 8000); // void zbog lint pravila
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Dogodila se nepoznata greška';
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
          onSubmit={e => void handleSubmit(e)} // void zbog lint pravila
        />
        <section className="mt-10">
          <h2 className="text-lg font-semibold mb-2">Promjena lozinke</h2>
          <ChangePasswordForm />
        </section>
      </main>
    </div>
  );
};

export default SystemAdminSettings;
