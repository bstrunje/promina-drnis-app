// features/systemManager/pages/settings/SystemManagerSettings.tsx
import React, { useState, useEffect } from 'react';
import { Shield, RefreshCw, Save } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../../../utils/config';
import { useSystemManager } from '../../../../context/SystemManagerContext';
import { useTimeZone } from '../../../../context/useTimeZone'; // Premješten u dedicated hook datoteku radi Fast Refresh pravila
import { SystemSettings } from '@shared/settings';
import { getCurrentDate } from '../../../../utils/dateUtils';
import systemManagerApi, { updateSystemSettings } from '../../utils/systemManagerApi';

interface SystemSettingsFormProps {
  settings: SystemSettings;
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
  // Stanje za fiksnu poruku o uspjehu
  const [showFixedSuccess, setShowFixedSuccess] = useState<boolean>(false);

  // Učitaj postavke pri inicijalizaciji komponente
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('systemManagerToken');
        const response = await axios.get(`${API_BASE_URL}/system-manager/settings`, {
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
    
    if (name === 'renewalStartDay') {
      const numValue = parseInt(value);
      if (numValue < 1 || numValue > 31) {
        setError('Renewal day must be between 1 and 31');
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
      // Dodajemo console.log za debugging
      console.log('Podaci koji se šalju na backend:', settings);
      
      // Korištenje centralizirane API funkcije za ažuriranje postavki sustava
      const updatedSettings = await updateSystemSettings(settings);
      setSettings(updatedSettings);
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
