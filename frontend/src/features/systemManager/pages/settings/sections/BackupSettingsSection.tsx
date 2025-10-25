// features/systemManager/pages/settings/sections/BackupSettingsSection.tsx
import React from 'react';
import { Save } from 'lucide-react';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { LocalSystemSettings } from '../hooks/useSystemSettings';

interface BackupSettingsSectionProps {
  settings: LocalSystemSettings;
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSave: () => Promise<void>;
}

export const BackupSettingsSection: React.FC<BackupSettingsSectionProps> = ({
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
    <CollapsibleSection title="Backup Settings" defaultOpen={false}>
      <form onSubmit={handleSubmit} className="space-y-6 mt-4">
        <p className="text-gray-600 text-sm mb-4">
          Configure automatic database backup settings for data protection and recovery.
        </p>

        <div className="space-y-4">
          {/* Backup Frequency */}
          <div>
            <label htmlFor="backupFrequency" className="block text-sm font-medium text-gray-700 mb-2">
              Backup Frequency
            </label>
            <select
              id="backupFrequency"
              name="backupFrequency"
              value={settings.backupFrequency ?? 'daily'}
              onChange={onChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">
              How often automatic backups should be created.
            </p>
          </div>

          {/* Backup Retention Days */}
          <div>
            <label htmlFor="backupRetentionDays" className="block text-sm font-medium text-gray-700 mb-2">
              Retention (days)
            </label>
            <input
              type="number"
              id="backupRetentionDays"
              name="backupRetentionDays"
              min="1"
              value={settings.backupRetentionDays ?? 7}
              onChange={onChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
            <p className="text-sm text-gray-500 mt-1">
              Number of days to keep backup files before automatic deletion.
            </p>
          </div>

          {/* Backup Storage Location */}
          <div>
            <label htmlFor="backupStorageLocation" className="block text-sm font-medium text-gray-700 mb-2">
              Storage Location
            </label>
            <select
              id="backupStorageLocation"
              name="backupStorageLocation"
              value={settings.backupStorageLocation ?? 'local'}
              onChange={onChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
              <option value="local">Local</option>
              <option value="s3" disabled>Amazon S3 (soon)</option>
              <option value="gcs" disabled>Google Cloud (soon)</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Where backup files should be stored. Cloud storage options coming soon.
            </p>
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
          {isLoading ? 'Saving...' : 'Save Backup Settings'}
        </button>
      </form>
    </CollapsibleSection>
  );
};
