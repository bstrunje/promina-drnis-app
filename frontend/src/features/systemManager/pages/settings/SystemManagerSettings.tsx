// features/systemManager/pages/settings/SystemManagerSettings.tsx
import React, { useState, useEffect } from 'react';
import { RefreshCw, Save, Calendar, Settings as SettingsIcon } from 'lucide-react';
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
  // 2FA settings (optional – backend may or may not return them)
  twoFactorGlobalEnabled?: boolean | null;
  twoFactorMembersEnabled?: boolean | null;
  twoFactorRequiredMemberRoles?: string[] | null;
  twoFactorRequiredMemberPermissions?: string[] | null;
  twoFactorOtpExpirySeconds?: number | null;
  twoFactorRememberDeviceDays?: number | null;
  // 2FA channels and trusted devices
  twoFactorChannelEmailEnabled?: boolean | null;
  twoFactorChannelSmsEnabled?: boolean | null;
  twoFactorChannelTotpEnabled?: boolean | null;
  twoFactorTrustedDevicesEnabled?: boolean | null;
  passwordGenerationStrategy?: 'FULLNAME_ISK_CARD' | 'RANDOM_8' | 'EMAIL_PREFIX_CARD_SUFFIX' | null;
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
      let passwordChanged = false;
      if (newPassword || oldPassword) {
        if (newPassword !== confirm) {
          setMessage('New password and confirmation do not match.');
          return;
        }
        if (!oldPassword) {
          setMessage('Old password is required to change password.');
          return;
        }
        await systemManagerApi.patch('/system-manager/change-password', { oldPassword, newPassword });
        passwordChanged = true;
      }

      const successMessage = [
        usernameChanged ? 'Username successfully changed.' : '',
        passwordChanged ? 'Password successfully changed.' : ''
      ].filter(Boolean).join(' ');

      if (successMessage) {
        setMessage(successMessage);
      } else if (!newUsername && !newPassword && !oldPassword) {
        setMessage('No changes were made.');
      }
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
    <form onSubmit={e => void handleSubmit(e)} className="flex flex-col gap-4">
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
  // UI rules: Global vs Roles/Permissions are mutually exclusive in UI
  const isGlobalOn = Boolean(settings.twoFactorGlobalEnabled);
  const isMembersOn = Boolean(settings.twoFactorMembersEnabled);
  // Disable roles/permissions controls when Global 2FA is ON or Members toggle is OFF
  const disableMembersControls = isGlobalOn || !isMembersOn;
  const disableGlobalToggle = isMembersOn;

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
            Password Generation Strategy
          </label>
          <select
            name="passwordGenerationStrategy"
            value={settings.passwordGenerationStrategy ?? 'FULLNAME_ISK_CARD'}
            onChange={onChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          >
            <option value="FULLNAME_ISK_CARD">Full Name + Separator + Card Number</option>
            <option value="RANDOM_8">Random 8 Characters</option>
            <option value="EMAIL_PREFIX_CARD_SUFFIX">Email Prefix + Card Digits</option>
          </select>
          <p className="text-sm text-gray-500 mt-1">
            Choose the method for automatically generating member passwords.
          </p>
          
          {/* Prikaz primjera za odabranu strategiju */}
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm font-semibold text-blue-800 mb-1">Password Example:</p>
            <p className="text-sm text-blue-700">
              {settings.passwordGenerationStrategy === 'RANDOM_8' && (
                <>
                  <strong>a3f7b2c9</strong> - Random 8 hexadecimal characters
                </>
              )}
              {(settings.passwordGenerationStrategy === 'FULLNAME_ISK_CARD' || !settings.passwordGenerationStrategy) && (
                <>
                  <strong>Božo Božić{settings.passwordSeparator ?? '-isk-'}{String(settings.cardNumberLength ?? 5).padStart(settings.cardNumberLength ?? 5, '0').replace(/./g, '3')}</strong>
                  {' '}- Full name + separator + card number
                </>
              )}
              {settings.passwordGenerationStrategy === 'EMAIL_PREFIX_CARD_SUFFIX' && (
                <>
                  <strong>bozo.bozic{String(settings.cardNumberLength ?? 5).padStart(settings.passwordCardDigits ?? 4, '3').slice(-(settings.passwordCardDigits ?? 4))}</strong>
                  {' '}- Email prefix + last {settings.passwordCardDigits ?? 4} digits of card number
                </>
              )}
            </p>
          </div>
        </div>

        {/* Separator field - prikazuje se samo za FULLNAME_ISK_CARD strategiju */}
        {(settings.passwordGenerationStrategy === 'FULLNAME_ISK_CARD' || !settings.passwordGenerationStrategy) && (
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Password Separator
            </label>
            <input
              type="text"
              name="passwordSeparator"
              value={settings.passwordSeparator ?? '-isk-'}
              onChange={onChange}
              placeholder="-isk-"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
            <p className="text-sm text-gray-500 mt-1">
              Custom separator between full name and card number (e.g., "-isk-", "-pd-", "_").
            </p>
          </div>
        )}

        {/* Card digits field - prikazuje se samo za EMAIL_PREFIX_CARD_SUFFIX strategiju */}
        {settings.passwordGenerationStrategy === 'EMAIL_PREFIX_CARD_SUFFIX' && (
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Card Number Digits to Use
            </label>
            <input
              type="number"
              name="passwordCardDigits"
              min="1"
              max={settings.cardNumberLength ?? 5}
              value={settings.passwordCardDigits ?? 4}
              onChange={onChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
            <p className="text-sm text-gray-500 mt-1">
              Number of last digits from card number to use in password (max: {settings.cardNumberLength ?? 5} based on card length setting).
            </p>
          </div>
        )}

        <hr className="my-6" />
        <h3 className="text-md font-semibold mb-4">Registration Rate Limit</h3>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
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

        <hr className="my-6" />
        <h3 className="text-md font-semibold mb-4">Membership Renewal Date</h3>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
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

        <hr className="my-6" />
        <h3 className="text-md font-semibold mb-4">Auto-Termination Date</h3>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
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

        <hr className="my-6" />
        <h3 className="text-md font-semibold mb-4">System Time Zone</h3>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex space-x-4">
            <div className="w-full">
              <select
                name="timeZone"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={settings.timeZone ?? 'Europe/Zagreb'}
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

        <div className="mb-4 flex items-center justify-between">
          <label className="block text-gray-700 text-sm font-bold">Enable 2FA globally</label>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="twoFactorGlobalEnabled"
              checked={Boolean(settings.twoFactorGlobalEnabled)}
              onChange={(e) => {
                const mockEvent = { target: { name: 'twoFactorGlobalEnabled', value: e.target.checked ? 'true' : 'false' } } as unknown as React.ChangeEvent<HTMLInputElement>;
                onChange(mockEvent);
              }}
              disabled={disableGlobalToggle}
              className="sr-only peer"
            />
            <div className="relative w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
          </label>
        </div>
        {disableGlobalToggle && (
          <p className="text-xs text-gray-500 mb-4">Global 2FA is disabled because Roles/Permissions 2FA is active.</p>
        )}

        <div className="mb-4 flex items-center justify-between">
          <label className="block text-gray-700 text-sm font-bold">Enable 2FA for members by roles/permissions</label>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="twoFactorMembersEnabled"
              checked={Boolean(settings.twoFactorMembersEnabled)}
              onChange={(e) => {
                const mockEvent = { target: { name: 'twoFactorMembersEnabled', value: e.target.checked ? 'true' : 'false' } } as unknown as React.ChangeEvent<HTMLInputElement>;
                onChange(mockEvent);
              }}
              disabled={isGlobalOn}
              className="sr-only peer"
            />
            <div className="relative w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
          </label>
        </div>

        {/* 2FA Channels and Trusted Devices */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded border">
            <span className="text-sm font-medium text-gray-700">Enable Email 2FA</span>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="twoFactorChannelEmailEnabled"
                checked={Boolean(settings.twoFactorChannelEmailEnabled)}
                onChange={(e) => {
                  const mockEvent = { target: { name: 'twoFactorChannelEmailEnabled', value: e.target.checked ? 'true' : 'false' } } as unknown as React.ChangeEvent<HTMLInputElement>;
                  onChange(mockEvent);
                }}
                className="sr-only peer"
              />
              <div className="relative w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            </label>
          </div>
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded border">
            <span className="text-sm font-medium text-gray-700">Enable SMS 2FA</span>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="twoFactorChannelSmsEnabled"
                checked={Boolean(settings.twoFactorChannelSmsEnabled)}
                onChange={(e) => {
                  const mockEvent = { target: { name: 'twoFactorChannelSmsEnabled', value: e.target.checked ? 'true' : 'false' } } as unknown as React.ChangeEvent<HTMLInputElement>;
                  onChange(mockEvent);
                }}
                className="sr-only peer"
              />
              <div className="relative w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            </label>
          </div>
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded border">
            <span className="text-sm font-medium text-gray-700">Enable TOTP (Authenticator)</span>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="twoFactorChannelTotpEnabled"
                checked={Boolean(settings.twoFactorChannelTotpEnabled)}
                onChange={(e) => {
                  const mockEvent = { target: { name: 'twoFactorChannelTotpEnabled', value: e.target.checked ? 'true' : 'false' } } as unknown as React.ChangeEvent<HTMLInputElement>;
                  onChange(mockEvent);
                }}
                className="sr-only peer"
              />
              <div className="relative w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            </label>
          </div>
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded border">
            <span className="text-sm font-medium text-gray-700">Enable Trusted Devices</span>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="twoFactorTrustedDevicesEnabled"
                checked={Boolean(settings.twoFactorTrustedDevicesEnabled)}
                onChange={(e) => {
                  const mockEvent = { target: { name: 'twoFactorTrustedDevicesEnabled', value: e.target.checked ? 'true' : 'false' } } as unknown as React.ChangeEvent<HTMLInputElement>;
                  onChange(mockEvent);
                }}
                className="sr-only peer"
              />
              <div className="relative w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Required Roles (CSV)</label>
            <input
              type="text"
              name="twoFactorRequiredMemberRolesCsv"
              value={(settings.twoFactorRequiredMemberRoles ?? []).join(', ')}
              onChange={onChange}
              placeholder="member_administrator, member_superuser"
              disabled={disableMembersControls}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <p className="text-sm text-gray-500 mt-1">Apply 2FA if member role matches any listed values.</p>
            {disableMembersControls && (
              <p className="text-xs text-gray-500 mt-1">
                {isGlobalOn
                  ? 'Disabled while Global 2FA is enabled.'
                  : 'Disabled until "Enable 2FA for members by roles/permissions" is turned on.'}
              </p>
            )}
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Required Permissions (CSV)</label>
            <input
              type="text"
              name="twoFactorRequiredMemberPermissionsCsv"
              value={(settings.twoFactorRequiredMemberPermissions ?? []).join(', ')}
              onChange={onChange}
              placeholder="canManageMembers, canEditFinances"
              disabled={disableMembersControls}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <p className="text-sm text-gray-500 mt-1">Apply 2FA if member has any of these permissions set to true.</p>
            {disableMembersControls && (
              <p className="text-xs text-gray-500 mt-1">Disabled while Global 2FA is enabled.</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">OTP expiry (seconds)</label>
            <input
              type="number"
              name="twoFactorOtpExpirySeconds"
              min="60"
              step="10"
              value={Number(settings.twoFactorOtpExpirySeconds ?? 300)}
              onChange={onChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
            <p className="text-sm text-gray-500 mt-1">Default 300s.</p>
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Remember device (days)</label>
            <input
              type="number"
              name="twoFactorRememberDeviceDays"
              min="1"
              step="1"
              value={Number(settings.twoFactorRememberDeviceDays ?? 30)}
              onChange={onChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
            <p className="text-sm text-gray-500 mt-1">Duration for trusted devices.</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Backup Settings</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="backupFrequency" className="block text-sm font-medium text-gray-700">Backup Frequency</label>
            <select
              id="backupFrequency"
              name="backupFrequency"
              value={settings.backupFrequency ?? 'daily'}
              onChange={onChange}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label htmlFor="backupRetentionDays" className="block text-sm font-medium text-gray-700">Retention (days)</label>
            <input
              type="number"
              id="backupRetentionDays"
              name="backupRetentionDays"
              min="1"
              value={settings.backupRetentionDays ?? 7}
              onChange={onChange}
              className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label htmlFor="backupStorageLocation" className="block text-sm font-medium text-gray-700">Storage Location</label>
            <select
              id="backupStorageLocation"
              name="backupStorageLocation"
              value={settings.backupStorageLocation ?? 'local'}
              onChange={onChange}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="local">Local</option>
              <option value="s3" disabled>Amazon S3 (soon)</option>
              <option value="gcs" disabled>Google Cloud (soon)</option>
            </select>
          </div>
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
  const { manager } = useSystemManager();
  const { refreshTimeZone } = useTimeZone(); // Dodana linija
  
  const [settings, setSettings] = useState<LocalSystemSettings>({
    id: "default",
    cardNumberLength: 5,
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
    // 2FA defaults
    twoFactorGlobalEnabled: false,
    twoFactorMembersEnabled: false,
    twoFactorRequiredMemberRoles: [],
    twoFactorRequiredMemberPermissions: [],
    twoFactorOtpExpirySeconds: 300,
    twoFactorRememberDeviceDays: 30,
    twoFactorChannelEmailEnabled: false,
    twoFactorChannelSmsEnabled: false,
    twoFactorChannelTotpEnabled: true,
    twoFactorTrustedDevicesEnabled: false,
    // Password generation defaults
    passwordGenerationStrategy: 'FULLNAME_ISK_CARD',
    passwordSeparator: '-isk-',
    passwordCardDigits: 4,
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
        const extended = data as LocalSystemSettings;
        if (extended.registrationRateLimitEnabled === undefined) {
          extended.registrationRateLimitEnabled = true;
        }
        if (extended.registrationWindowMs === undefined) {
          extended.registrationWindowMs = 60 * 60 * 1000;
        }
        if (extended.registrationMaxAttempts === undefined) {
          extended.registrationMaxAttempts = 5;
        }
        // 2FA defaults ako nedostaju na backendu
        if (extended.twoFactorGlobalEnabled === undefined) {
          extended.twoFactorGlobalEnabled = false;
        }
        if (extended.twoFactorMembersEnabled === undefined) {
          extended.twoFactorMembersEnabled = false;
        }
        if (!Array.isArray(extended.twoFactorRequiredMemberRoles)) {
          extended.twoFactorRequiredMemberRoles = [];
        }
        if (!Array.isArray(extended.twoFactorRequiredMemberPermissions)) {
          extended.twoFactorRequiredMemberPermissions = [];
        }
        extended.twoFactorOtpExpirySeconds ??= 300;
        extended.twoFactorRememberDeviceDays ??= 30;
        extended.passwordGenerationStrategy ??= 'FULLNAME_ISK_CARD';
        extended.passwordSeparator ??= '-isk-';
        extended.passwordCardDigits ??= 4;
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
    // 2FA boolean toggles
    if (
      name === 'twoFactorGlobalEnabled' ||
      name === 'twoFactorMembersEnabled' ||
      name === 'twoFactorChannelEmailEnabled' ||
      name === 'twoFactorChannelSmsEnabled' ||
      name === 'twoFactorChannelTotpEnabled' ||
      name === 'twoFactorTrustedDevicesEnabled'
    ) {
      const boolVal = value === 'true' || value === 'on' || value === '1';
      setSettings(prev => ({ ...prev, [name]: boolVal }));
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
    // 2FA numeric inputs
    if (name === 'twoFactorOtpExpirySeconds' || name === 'twoFactorRememberDeviceDays') {
      const numValue = parseInt(value, 10);
      if (!Number.isFinite(numValue) || numValue <= 0) {
        setError(name === 'twoFactorOtpExpirySeconds'
          ? 'OTP expiry (s) must be a positive number'
          : 'Remember device (days) must be a positive number');
        return;
      }
      setSettings(prev => ({ ...prev, [name]: numValue }));
      setError(null);
      return;
    }
    // 2FA CSV arrays
    if (name === 'twoFactorRequiredMemberRolesCsv') {
      const csvArray: string[] = value.split(',').map(s => s.trim()).filter(Boolean);
      setSettings(prev => ({ ...prev, twoFactorRequiredMemberRoles: csvArray }));
      setError(null);
      return;
    }
    if (name === 'twoFactorRequiredMemberPermissionsCsv') {
      const csvArray: string[] = value.split(',').map(s => s.trim()).filter(Boolean);
      setSettings(prev => ({ ...prev, twoFactorRequiredMemberPermissions: csvArray }));
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
    else if (name === 'timeZone' || name === 'passwordGenerationStrategy' || name === 'passwordSeparator') {
      setSettings(prev => ({
        ...prev,
        [name]: value
      }));
    }
    else if (name === 'passwordCardDigits') {
      const numValue = parseInt(value);
      const maxDigits = settings.cardNumberLength ?? 5;
      if (numValue < 1 || numValue > maxDigits) {
        setError(`Card digits must be between 1 and ${maxDigits}`);
        return;
      }
      setSettings(prev => ({
        ...prev,
        [name]: numValue
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
      const updatedSettings = await updateSystemSettings(settings as SystemSettings);
      setSettings(updatedSettings as LocalSystemSettings);
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

  // Global System Manager nema pristup Settings-ima (early return nakon svih hooks)
  if (manager?.organization_id === null) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <SettingsIcon className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Access Denied:</strong> Global System Manager cannot access organization-specific settings.
              </p>
              <p className="text-sm text-yellow-700 mt-2">
                System Settings are managed by individual Organization System Managers.
              </p>
              <button
                onClick={() => navigate('/system-manager')}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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



      {/* Main Content */}
      <main className="container mx-auto p-4">

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

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mt-6">
          <h2 className="text-lg font-semibold mb-4">Change Username & Password</h2>
          <ChangePasswordForm />
        </div>
      </main>
    </div>
  );
};

export default SystemManagerSettings;
