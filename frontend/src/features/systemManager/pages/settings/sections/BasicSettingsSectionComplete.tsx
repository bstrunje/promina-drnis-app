// features/systemManager/pages/settings/sections/BasicSettingsSectionComplete.tsx
import React from 'react';
import { Save } from 'lucide-react';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { LocalSystemSettings } from '../hooks/useSystemSettings';

interface BasicSettingsSectionCompleteProps {
  settings: LocalSystemSettings;
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSave: () => Promise<void>;
}

export const BasicSettingsSectionComplete: React.FC<BasicSettingsSectionCompleteProps> = ({
  settings,
  isLoading,
  error,
  successMessage,
  onChange,
  onSave
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void onSave();
  };

  return (
    <CollapsibleSection title="Basic System Settings" defaultOpen={false}>
      <form onSubmit={handleSubmit} className="space-y-6 mt-4">
        
        {/* Card Number Length */}
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

        {/* Password Generation Strategy */}
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
                  <br />
                  <span className="text-xs text-blue-600 mt-1 block">
                    ⚠️ Note: With RANDOM_8, members can be registered with only a paid membership fee (card number not required)
                  </span>
                </>
              )}
              {(settings.passwordGenerationStrategy === 'FULLNAME_ISK_CARD' || !settings.passwordGenerationStrategy) && (
                <>
                  <strong>Božo Božić{settings.passwordSeparator ?? '-isk-'}{String(settings.cardNumberLength ?? 5).padStart(settings.cardNumberLength ?? 5, '0').replace(/./g, '3')}</strong>
                  {' '}- Full name + separator + card number
                  <br />
                  <span className="text-xs text-blue-600 mt-1 block">
                    ℹ️ Requires: Paid membership fee AND assigned card number
                  </span>
                </>
              )}
              {settings.passwordGenerationStrategy === 'EMAIL_PREFIX_CARD_SUFFIX' && (
                <>
                  <strong>bozo.bozic{String(settings.cardNumberLength ?? 5).padStart(settings.passwordCardDigits ?? 4, '3').slice(-(settings.passwordCardDigits ?? 4))}</strong>
                  {' '}- Email prefix + last {settings.passwordCardDigits ?? 4} digits of card number
                  <br />
                  <span className="text-xs text-blue-600 mt-1 block">
                    ℹ️ Requires: Paid membership fee AND assigned card number
                  </span>
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

        {/* Registration Rate Limit */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          <p className="text-sm text-gray-600 mb-4">
            Protect against spam by limiting registration attempts from the same IP address.
          </p>
          <div className="mb-4 flex items-center justify-between">
            <label className="block text-gray-700 text-sm font-bold">
              Enable rate limiting for registrations
            </label>
            <input
              type="checkbox"
              name="registrationRateLimitEnabled"
              checked={settings.registrationRateLimitEnabled ?? false}
              onChange={onChange}
              className="h-4 w-4"
            />
          </div>

          {settings.registrationRateLimitEnabled && (
            <>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Time Window (minutes)
                </label>
                <input
                  type="number"
                  name="registrationWindowMs"
                  value={Math.floor((settings.registrationWindowMs ?? 3600000) / 60000)}
                  onChange={(e) => {
                    const event = {
                      target: {
                        name: 'registrationWindowMs',
                        value: (parseInt(e.target.value) * 60000).toString()
                      }
                    } as React.ChangeEvent<HTMLInputElement>;
                    onChange(event);
                  }}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Time period for counting registration attempts.
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Maximum Attempts
                </label>
                <input
                  type="number"
                  name="registrationMaxAttempts"
                  value={settings.registrationMaxAttempts ?? 5}
                  onChange={onChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Maximum number of registration attempts allowed within the time window.
                </p>
              </div>
            </>
          )}
        </div>

        <hr className="my-6" />
        <h3 className="text-md font-semibold mb-4">Membership Renewal Date</h3>

        {/* Membership Renewal Date */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          <p className="text-sm text-gray-600 mb-4">
            Set the date when membership renewal period begins each year.
          </p>
          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Renewal Start Month
              </label>
              <select
                name="renewalStartMonth"
                value={settings.renewalStartMonth ?? 11}
                onChange={onChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <option key={month} value={month}>
                    {new Date(2000, month - 1).toLocaleString('en-US', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Renewal Start Day
              </label>
              <input
                type="number"
                name="renewalStartDay"
                min="1"
                max="31"
                value={settings.renewalStartDay ?? 1}
                onChange={onChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>
          </div>
        </div>

        <hr className="my-6" />
        <h3 className="text-md font-semibold mb-4">Auto-Termination Date</h3>

        {/* Auto-Termination Date */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          <p className="text-sm text-gray-600 mb-4">
            Set the date when memberships automatically terminate if not renewed.
          </p>
          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Termination Month
              </label>
              <select
                name="membershipTerminationMonth"
                value={settings.membershipTerminationMonth ?? 12}
                onChange={onChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <option key={month} value={month}>
                    {new Date(2000, month - 1).toLocaleString('en-US', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Termination Day
              </label>
              <input
                type="number"
                name="membershipTerminationDay"
                min="1"
                max="31"
                value={settings.membershipTerminationDay ?? 31}
                onChange={onChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>
          </div>
        </div>

        <hr className="my-6" />
        <h3 className="text-md font-semibold mb-4">System Time Zone</h3>

        {/* System Time Zone */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600 mb-4">
            Set the default time zone for the system. This affects date/time displays and scheduling.
          </p>
          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Time Zone
              </label>
              <select
                name="timeZone"
                value={settings.timeZone ?? 'Europe/Zagreb'}
                onChange={onChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              >
                <option value="Europe/Zagreb">Europe/Zagreb (CET/CEST)</option>
                <option value="Europe/Belgrade">Europe/Belgrade (CET/CEST)</option>
                <option value="Europe/Vienna">Europe/Vienna (CET/CEST)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-4">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mt-4">
            {successMessage}
          </div>
        )}

        {/* Save Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 mt-6"
        >
          <Save className="w-4 h-4" />
          {isLoading ? 'Saving...' : 'Save Basic Settings'}
        </button>
      </form>
    </CollapsibleSection>
  );
};
