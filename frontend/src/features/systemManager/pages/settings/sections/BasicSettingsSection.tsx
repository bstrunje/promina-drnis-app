// features/systemManager/pages/settings/sections/BasicSettingsSection.tsx
import React from 'react';
import { Save } from 'lucide-react';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { LocalSystemSettings } from '../hooks/useSystemSettings';

interface BasicSettingsSectionProps {
  settings: LocalSystemSettings;
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
  onUpdate: (updates: Partial<LocalSystemSettings>) => void;
  onSave: () => Promise<void>;
}

export const BasicSettingsSection: React.FC<BasicSettingsSectionProps> = ({
  settings,
  isLoading,
  error,
  successMessage,
  onUpdate,
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
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Member Card Number Length
          </label>
          <input
            type="number"
            name="cardNumberLength"
            min="4"
            max="10"
            value={settings.cardNumberLength ?? 5}
            onChange={(e) => onUpdate({ cardNumberLength: parseInt(e.target.value) })}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
          <p className="text-gray-600 text-xs mt-1">
            Number of digits for member card numbers (4-10)
          </p>
        </div>

        {/* Renewal Start Month */}
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Membership Renewal Start Month
          </label>
          <select
            name="renewalStartMonth"
            value={settings.renewalStartMonth ?? 11}
            onChange={(e) => onUpdate({ renewalStartMonth: parseInt(e.target.value) })}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
              <option key={month} value={month}>
                {new Date(2000, month - 1).toLocaleString('hr-HR', { month: 'long' })}
              </option>
            ))}
          </select>
        </div>

        {/* Renewal Start Day */}
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Membership Renewal Start Day
          </label>
          <input
            type="number"
            name="renewalStartDay"
            min="1"
            max="31"
            value={settings.renewalStartDay ?? 1}
            onChange={(e) => onUpdate({ renewalStartDay: parseInt(e.target.value) })}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>

        {/* Termination Month */}
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Membership Termination Month
          </label>
          <select
            name="membershipTerminationMonth"
            value={settings.membershipTerminationMonth ?? 12}
            onChange={(e) => onUpdate({ membershipTerminationMonth: parseInt(e.target.value) })}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
              <option key={month} value={month}>
                {new Date(2000, month - 1).toLocaleString('hr-HR', { month: 'long' })}
              </option>
            ))}
          </select>
        </div>

        {/* Termination Day */}
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Membership Termination Day
          </label>
          <input
            type="number"
            name="membershipTerminationDay"
            min="1"
            max="31"
            value={settings.membershipTerminationDay ?? 31}
            onChange={(e) => onUpdate({ membershipTerminationDay: parseInt(e.target.value) })}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>

        {/* Time Zone */}
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Time Zone
          </label>
          <select
            name="timeZone"
            value={settings.timeZone ?? 'Europe/Zagreb'}
            onChange={(e) => onUpdate({ timeZone: e.target.value })}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          >
            <option value="Europe/Zagreb">Europe/Zagreb (CET/CEST)</option>
            <option value="Europe/Belgrade">Europe/Belgrade (CET/CEST)</option>
            <option value="Europe/Vienna">Europe/Vienna (CET/CEST)</option>
            <option value="UTC">UTC</option>
          </select>
        </div>

        {/* Password Generation Strategy */}
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Password Generation Strategy
          </label>
          <select
            name="passwordGenerationStrategy"
            value={settings.passwordGenerationStrategy ?? 'FULLNAME_ISK_CARD'}
            onChange={(e) => onUpdate({ passwordGenerationStrategy: e.target.value as 'FULLNAME_ISK_CARD' | 'RANDOM_8' | 'EMAIL_PREFIX_CARD_SUFFIX' })}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          >
            <option value="FULLNAME_ISK_CARD">Full Name + Separator + Card Number</option>
            <option value="FIRSTNAME_ISK_CARD">First Name + Separator + Card Number</option>
            <option value="LASTNAME_ISK_CARD">Last Name + Separator + Card Number</option>
          </select>
        </div>

        {/* Password Separator */}
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Password Separator
          </label>
          <input
            type="text"
            name="passwordSeparator"
            value={settings.passwordSeparator ?? '-isk-'}
            onChange={(e) => onUpdate({ passwordSeparator: e.target.value })}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="-isk-"
          />
        </div>

        {/* Password Card Digits */}
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Card Number Digits in Password
          </label>
          <input
            type="number"
            name="passwordCardDigits"
            min="1"
            max={settings.cardNumberLength ?? 5}
            value={settings.passwordCardDigits ?? 4}
            onChange={(e) => onUpdate({ passwordCardDigits: parseInt(e.target.value) })}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
          <p className="text-gray-600 text-xs mt-1">
            Number of card digits to include in password (1-{settings.cardNumberLength})
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {successMessage}
          </div>
        )}

        {/* Save Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isLoading ? 'Saving...' : 'Save Basic Settings'}
        </button>
      </form>
    </CollapsibleSection>
  );
};
