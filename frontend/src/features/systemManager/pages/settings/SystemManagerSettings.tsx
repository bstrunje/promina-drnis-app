// features/systemManager/pages/settings/SystemManagerSettings.tsx
import React, { useState, useEffect } from 'react';
import { Shield, RefreshCw, Save, Calendar, Settings as SettingsIcon } from 'lucide-react';
import axios from 'axios';
import { useSystemManager } from '../../../../context/SystemManagerContext';
import { useTimeZone } from '../../../../context/useTimeZone'; // Premješten u dedicated hook datoteku radi Fast Refresh pravila
import { SystemSettings } from '@shared/settings';
import { getCurrentDate } from '../../../../utils/dateUtils';
import systemManagerApi, { updateSystemSettings, getSystemSettings } from '../../utils/systemManagerApi';
import { useNavigate } from 'react-router-dom';

// Lokalno proširenje postavki – bez mijenjanja shared tipova
type LocalSystemSettings = SystemSettings & {
  registrationRateLimitEnabled?: boolean | null;
  registrationWindowMs?: number | null;
  registrationMaxAttempts?: number | null;
};

interface SystemSettingsFormProps {
  settings: LocalSystemSettings;
  isLoading: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  showFixedSuccess?: boolean; // Dodajemo showFixedSuccess kao opcionalni prop
}

export function ChangePasswordForm() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [message, setMessage] = useState('');
  const { manager, refreshManager } = useSystemManager();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage('');
    let usernameChanged = false;
    try {
      if (newUsername && newUsername !== manager?.username) {
        await systemManagerApi.patch('/system-manager/change-username', { newUsername });
        usernameChanged = true;
        await refreshManager(); // automatski osvježi username u UI
      }
      if (oldPassword && newPassword) {
        if (newPassword !== confirm) {
          setMessage('New password and confirmation do not match.');
          return;
        }
        await systemManagerApi.patch('/system-manager/change-password', { oldPassword, newPassword });
      }
      setMessage(
        (usernameChanged ? 'Username successfully changed. ' : '') +
        (oldPassword && newPassword ? 'Password successfully changed.' : '')
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
        setMessage(serverMsg ?? 'Error saving changes.');
      } else if (err instanceof Error) {
        setMessage(typeof err.message === 'string' ? err.message : 'Error saving changes.');
      } else {
        setMessage('Error saving changes.');
      }
    }
  };

  return (
    <form onSubmit={e => void handleSubmit(e)} className="max-w-md mx-auto flex flex-col gap-4 bg-white p-6 rounded shadow">
      <label htmlFor="newUsername" className="font-medium">New username (optional)</label>
      <input
        id="newUsername"
        type="text"
        autoComplete="username"
        className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={newUsername}
        onChange={e => setNewUsername(e.target.value)}
        placeholder={manager?.username ?? 'Current username'}
      />
      <label htmlFor="oldPassword" className="font-medium">Old password</label>
      {/* Skriveno polje za username radi accessibility i browser autofill */}
      <input
        type="text"
        name="username"
        autoComplete="username"
        value={manager?.username ?? ''}
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
      <label htmlFor="newPassword" className="font-medium">New password</label>
      <input
        id="newPassword"
        type="password"
        autoComplete="new-password"
        className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={newPassword}
        onChange={e => setNewPassword(e.target.value)}
        required={!!oldPassword}
      />
      <label htmlFor="confirmPassword" className="font-medium">Confirm New Password</label>
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
        Save Changes
      </button>
      {message && <div className={`mt-2 text-sm ${message.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>{message}</div>}
    </form>
  );
}

// Izdvojeni formular za bolje organiziran kod
const SystemSettingsForm: React.FC<SystemSettingsFormProps> = ({
  settings,
  isLoading,
  onChange,
  onSubmit,
  showFixedSuccess
}) => {
  
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Basic System Settings</h2>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Member Card Number Length
          </label>
          <input
            type="number"
            name="cardNumberLength"
            min="1"
            max="10"
            value={settings.cardNumberLength ?? 5}
            onChange={onChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
          <p className="text-sm text-gray-500 mt-1">
            Defines the length of member card numbers.
          </p>
        </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Registration rate limit</h2>

        <div className="mb-4 flex items-center justify-between">
          <label className="block text-gray-700 text-sm font-bold">
            Enable rate limiting for registrations
          </label>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="registrationRateLimitEnabled"
              checked={Boolean(settings.registrationRateLimitEnabled ?? true)}
              onChange={(e) => {
                const mockEvent = {
                  target: {
                    name: 'registrationRateLimitEnabled',
                    value: e.target.checked ? 'true' : 'false'
                  }
                } as unknown as React.ChangeEvent<HTMLInputElement>;
                onChange(mockEvent);
              }}
              className="sr-only peer"
            />
            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Window (ms)
              {` (~ ${Math.round(Number(settings.registrationWindowMs ?? 3600000) / 60000)} min)`}
            </label>
            <input
              type="number"
              name="registrationWindowMs"
              min="60000"
              step="1000"
              value={Number(settings.registrationWindowMs ?? 3600000)}
              onChange={onChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
            <p className="text-sm text-gray-500 mt-1">
              Time window for counting attempts (default 1h = 3,600,000 ms). Current value: ~ {Math.round(Number(settings.registrationWindowMs ?? 3600000) / 60000)} minutes.
            </p>
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Max attempts
            </label>
            <input
              type="number"
              name="registrationMaxAttempts"
              min="1"
              value={Number(settings.registrationMaxAttempts ?? 5)}
              onChange={onChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
            <p className="text-sm text-gray-500 mt-1">Maximum registration attempts per IP within the window.</p>
          </div>
        </div>
      </div>

        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Membership Renewal Date
          </label>
          <div className="flex space-x-4">
            <div>
              <label
                htmlFor="renewalStartDay"
                className="block text-sm font-medium text-gray-700"
              >
                Day
              </label>
              <input
                type="number"
                name="renewalStartDay"
                className="mt-1 block w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Day"
                min="1"
                max="31"
                value={settings.renewalStartDay ?? 1}
                onChange={onChange}
              />
            </div>
            <div>
              <label
                htmlFor="renewalStartMonth"
                className="block text-sm font-medium text-gray-700"
              >
                Month
              </label>
              <select
                name="renewalStartMonth"
                className="mt-1 block w-36 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={settings.renewalStartMonth ?? 11}
                onChange={onChange}
              >
                <option value={11}>December</option>
                <option value={10}>November</option>
              </select>
            </div>
          </div>
          <div className="mt-2 space-y-2">
            <p className="text-sm text-gray-500">
              Sets the cutoff date for membership renewal processing.
            </p>
            <p className="text-sm text-blue-600">
              If payment is received after this date, membership starts from January 1st of the following year.
            </p>
            <p className="text-sm text-blue-600">
              If payment is received before or on this date, membership starts immediately.
            </p>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Auto-Termination Date (for unpaid memberships)
          </label>
          <div className="flex space-x-4">
            <div>
              <label
                htmlFor="membershipTerminationDay"
                className="block text-sm font-medium text-gray-700"
              >
                Day
              </label>
              <input
                type="number"
                name="membershipTerminationDay"
                className="mt-1 block w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Day"
                min="1"
                max="31"
                value={(settings.membershipTerminationDay ?? 1).toString()}
                onChange={onChange}
              />
            </div>
            <div>
              <label
                htmlFor="membershipTerminationMonth"
                className="block text-sm font-medium text-gray-700"
              >
                Month
              </label>
              <select
                name="membershipTerminationMonth"
                className="mt-1 block w-36 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={(settings.membershipTerminationMonth ?? 3).toString()}
                onChange={onChange}
              >
                <option value={1}>January</option>
                <option value={2}>February</option>
                <option value={3}>March</option>
                <option value={4}>April</option>
                <option value={5}>May</option>
                <option value={6}>June</option>
                <option value={7}>July</option>
                <option value={8}>August</option>
                <option value={9}>September</option>
                <option value={10}>October</option>
                <option value={11}>November</option>
                <option value={12}>December</option>
              </select>
            </div>
          </div>
          <div className="mt-2 space-y-2">
            <p className="text-sm text-gray-500">
              Sets the date when memberships are automatically terminated if not renewed.
            </p>
            <p className="text-sm text-red-600">
              After this date, all memberships without payment for the current year will be automatically set to 'inactive' status.
            </p>
            <p className="text-sm text-blue-600">
              Default: March 1st (recommended to allow members time to renew after the new year).
            </p>
          </div>
        </div>

        {/* Dodana kontrola za vremensku zonu */}
        <div className="mt-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            System Time Zone
          </label>
          <div className="flex space-x-4">
            <div className="w-full">
              <select
                name="timeZone"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={settings.timeZone ?? 'Europe/Zagreb'} // Koristi nullish coalescing operator
                onChange={onChange}
              >
                <option value="Europe/Zagreb">Zagreb (UTC+1/UTC+2)</option>
                <option value="Europe/Belgrade">Beograd (UTC+1/UTC+2)</option>
                <option value="Europe/Berlin">Berlin (UTC+1/UTC+2)</option>
                <option value="Europe/London">London (UTC+0/UTC+1)</option>
                <option value="UTC">UTC (Coordinated Universal Time)</option>
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
                This setting affects date and time display throughout the application.
              </p>
              <div className="mt-1 text-xs text-blue-600">
                Time zones are displayed with their UTC offset (standard/daylight).
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Security Settings</h2>
        
        <div className="text-sm text-gray-500 py-2">
          <p>Additional security settings will be available in future versions:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Two-factor authentication settings</li>
            <li>Password complexity rules</li>
            <li>Session settings</li>
            <li>Authorization rules</li>
          </ul>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Backup Settings</h2>
        
        <div className="text-sm text-gray-500 py-2">
          <p>Backup settings will be available in future versions:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Frequency of automatic backup creation</li>
            <li>Storage location</li>
            <li>Retention settings</li>
          </ul>
        </div>
      </div>

      <div className="flex justify-end space-x-4 items-center">
        {/* Vizualni indikator uspjeha pored gumba */}
        {showFixedSuccess === true && (
          <div className="text-green-600 font-medium animate-pulse mr-2 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Spremljeno!
          </div>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </button>
      </div>
    </form>
  );
};

const SystemManagerSettings: React.FC = () => {
  const navigate = useNavigate();
  const { refreshTimeZone } = useTimeZone(); // Dodana linija
  const [settings, setSettings] = useState<LocalSystemSettings>({
    id: "default",
    cardNumberLength: 5,
    membershipFee: 0, // Dodano zbog tipa SystemSettings
    paymentDueMonths: 12, // Dodano zbog tipa SystemSettings
    renewalStartMonth: 11, // Prosinac kao zadana vrijednost
    renewalStartDay: 31,
    timeZone: 'Europe/Zagreb', // Dodana zadana vremenska zona
    membershipTerminationDay: 1, // Default 1. ožujak
    membershipTerminationMonth: 3,
    updatedAt: getCurrentDate(),
    // Registracijski rate limit – default vrijednosti
    registrationRateLimitEnabled: true,
    registrationWindowMs: 60 * 60 * 1000,
    registrationMaxAttempts: 5,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // Stanje za fiksnu poruku o uspjehu
  const [showFixedSuccess, setShowFixedSuccess] = useState<boolean>(false);

  // Učitaj postavke pri inicijalizaciji komponente
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const data = await getSystemSettings();
        // Omogući dodatna polja ako ih backend vraća
        const extended = data as unknown as LocalSystemSettings;
        if (extended.registrationRateLimitEnabled === undefined) {
          extended.registrationRateLimitEnabled = true;
        }
        if (extended.registrationWindowMs === undefined) {
          extended.registrationWindowMs = 60 * 60 * 1000;
        }
        if (extended.registrationMaxAttempts === undefined) {
          extended.registrationMaxAttempts = 5;
        }
        setSettings(extended);
      } catch (err: unknown) {
        let errorMessage: string;
        if (axios.isAxiosError(err)) {
          // Provjera da err.response.data postoji i da ima message tipa string
          const resp = err.response?.data as unknown;
          errorMessage = (typeof resp === 'object' && resp !== null && 'message' in resp && typeof (resp as { message?: unknown }).message === 'string')
            ? (resp as { message: string }).message
            : err.message;
        } else if (err instanceof Error) {
          errorMessage = typeof err.message === 'string' ? err.message : 'An unknown error occurred';
        } else {
          errorMessage = 'An unknown error occurred';
        }
        setError(`Error fetching settings: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    };

    void loadSettings(); // void zbog lint pravila
  }, []);

  // Obrada promjene vrijednosti u poljima
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Registracijski rate limit – obrada prekidača i numeričkih polja
    if (name === 'registrationRateLimitEnabled') {
      const boolVal = value === 'true' || value === 'on' || value === '1';
      setSettings(prev => ({ ...prev, registrationRateLimitEnabled: boolVal }));
      setError(null);
      return;
    }
    if (name === 'registrationWindowMs' || name === 'registrationMaxAttempts') {
      const numValue = parseInt(value, 10);
      if (!Number.isFinite(numValue) || numValue <= 0) {
        setError(name === 'registrationWindowMs'
          ? 'Window (ms) mora biti pozitivan broj'
          : 'Max attempts mora biti pozitivan broj');
        return;
      }
      setSettings(prev => ({ ...prev, [name]: numValue }));
      setError(null);
      return;
    }

    if (name === 'renewalStartDay' || name === 'membershipTerminationDay') {
      const numValue = parseInt(value);
      if (numValue < 1 || numValue > 31) {
        setError('Day must be between 1 and 31');
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
        setError('Card number length must be between 1 and 10');
        return;
      }
      
      setSettings(prev => ({
        ...prev,
        [name]: numValue
      }));
    }
    else if (name === 'renewalStartMonth' || name === 'membershipTerminationMonth') {
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
      // Dodajemo console.log za debugging
      console.log('Podaci koji se šalju na backend:', settings);
      
      // Korištenje centralizirane API funkcije za ažuriranje postavki sustava
      const updatedSettings = await updateSystemSettings(settings as unknown as SystemSettings);
      setSettings(updatedSettings as unknown as LocalSystemSettings);
      setSuccessMessage("Settings successfully updated!");
      
      // Postavi fiksnu poruku o uspjehu
      setShowFixedSuccess(true);
      
      // Osvježi vremensku zonu u kontekstu
      void refreshTimeZone(); // void zbog lint pravila
      
      // Automatski sakrij poruke uspjeha nakon 8 sekundi
      void setTimeout(() => {
        setSuccessMessage(null);
        setShowFixedSuccess(false);
      }, 8000); // void zbog lint pravila
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(`Error updating settings: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Fiksna poruka o uspjehu na dnu ekrana */}
      {showFixedSuccess && (
        <div 
          className="fixed bottom-5 left-1/2 transform -translate-x-1/2 bg-green-600 text-white p-4 rounded-md shadow-lg z-50 flex items-center transition-all duration-500 ease-in-out"
          style={{
            maxWidth: '90%',
            width: '400px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            animation: 'bounce 1s'
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-medium text-lg">Settings successfully updated!</span>
        </div>
      )}
      

      
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-lg font-semibold text-gray-900 flex items-center">
              <Shield className="h-5 w-5 mr-2 text-indigo-600" />
              System Manager - Settings
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-lg text-white p-6 mb-6">
          <h1 className="text-2xl font-bold mb-2">System Settings</h1>
          <p className="opacity-90">System parameter configuration</p>
        </div>

        {/* Quick Links to Advanced Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => navigate('/system-manager/holidays')}
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Holidays Management</h3>
                <p className="text-sm text-gray-600">
                  Manage public holidays that affect duty scheduling
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/system-manager/duty-settings')}
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                <SettingsIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Duty Calendar Settings</h3>
                <p className="text-sm text-gray-600">
                  Configure duty schedule parameters and availability
                </p>
              </div>
            </div>
          </button>
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
          showFixedSuccess={showFixedSuccess}
        />
        <section className="mt-10">
          <h2 className="text-lg font-semibold mb-2">Change Password</h2>
          <ChangePasswordForm />
        </section>
      </main>
    </div>
  );
};

export default SystemManagerSettings;
