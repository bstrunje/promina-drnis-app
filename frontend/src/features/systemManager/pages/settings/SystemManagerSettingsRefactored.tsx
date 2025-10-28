// features/systemManager/pages/settings/SystemManagerSettingsRefactored.tsx
import React from 'react';
import { Calendar, Settings as SettingsIcon } from 'lucide-react';
import { useSystemManager } from '../../../../context/SystemManagerContext';
import { useSystemManagerNavigation } from '../../hooks/useSystemManagerNavigation';
import { useSystemSettings } from './hooks/useSystemSettings';
import { BasicSettingsSectionComplete } from './sections/BasicSettingsSectionComplete';
import { SecuritySettingsSection } from './sections/SecuritySettingsSection';
import { BackupSettingsSection } from './sections/BackupSettingsSection';
import { ActivitiesSection } from './sections/ActivitiesSection';
import { ChangePasswordSection } from './sections/ChangePasswordSection';

/**
 * REFAKTORIRANI System Manager Settings
 * 
 * Struktura:
 * - Svaka sekcija je odvojena u zasebnu komponentu
 * - Collapsible sekcije
 * - Svaka sekcija ima svoj Save button
 * - Shared state management kroz useSystemSettings hook
 */
const SystemManagerSettingsRefactored: React.FC = () => {
  const { manager } = useSystemManager();
  const { navigateTo } = useSystemManagerNavigation();
  
  const {
    settings,
    isLoading,
    error,
    successMessage,
    saveAllSettings,
    savePartialSettings,
    handleChange,
    handleRolesChange,
    handlePermissionsChange,
    setSuccessMessage,
    setError
  } = useSystemSettings();

  // Globalni System Manager nema pristup Settings-ima
  if (!manager?.organization_id) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">
              Access Restricted
            </h2>
            <p className="text-yellow-700">
              Global System Managers cannot access organization-specific settings.
              Please select an organization to manage its settings.
            </p>
            <button
              onClick={() => navigateTo('/system-manager')}
              className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Back to Overview
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handler za spremanje Basic Settings
  const handleSaveBasicSettings = async () => {
    await saveAllSettings();
  };

  // Handler za spremanje Activity Recognition Rates
  const handleSaveActivityRecognition = async (roles: { key: string; name: string; percentage: number; description: string }[]): Promise<void> => {
    try {
      // Konvertiraj roles array u objekt { "GUIDE": 100, "ASSISTANT_GUIDE": 50, ... }
      const roleRecognition = roles.reduce((acc, role) => {
        // Konvertiraj key u uppercase format (guide -> GUIDE, assistant_guide -> ASSISTANT_GUIDE)
        const roleKey = role.key.toUpperCase();
        acc[roleKey] = role.percentage;
        return acc;
      }, {} as Record<string, number>);

      if (import.meta.env.MODE === 'development') {
        console.log('[SETTINGS] Saving activity recognition rates:', roleRecognition);
      }
      
      // Spremi u bazu (partial update)
      await savePartialSettings({ activityRoleRecognition: roleRecognition });
      
      setSuccessMessage('Activity recognition rates updated successfully!');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save recognition rates';
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
    }
  };

  // Handler za spremanje Activity Hours Threshold
  const handleSaveActivityThreshold = async (threshold: number): Promise<void> => {
    try {
      // Spremi samo activityHoursThreshold u bazu (partial update)
      await savePartialSettings({ activityHoursThreshold: threshold });
      
      setSuccessMessage(`Activity status threshold updated to ${threshold} hours!`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save threshold';
      setError(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Quick Links to Advanced Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => navigateTo('/system-manager/holidays')}
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
            onClick={() => navigateTo('/system-manager/duty-settings')}
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

        {/* Sekcije */}
        <div className="space-y-4">
          {/* Basic Settings */}
          <BasicSettingsSectionComplete
            settings={settings}
            isLoading={isLoading}
            error={error}
            successMessage={successMessage}
            onChange={handleChange}
            onSave={handleSaveBasicSettings}
          />

          {/* Security Settings */}
          <SecuritySettingsSection
            settings={settings}
            isLoading={isLoading}
            error={error}
            successMessage={successMessage}
            onChange={handleChange}
            onRolesChange={handleRolesChange}
            onPermissionsChange={handlePermissionsChange}
            onSave={handleSaveBasicSettings}
          />

          {/* Backup Settings */}
          <BackupSettingsSection
            settings={settings}
            isLoading={isLoading}
            error={error}
            successMessage={successMessage}
            onChange={handleChange}
            onSave={handleSaveBasicSettings}
          />

          {/* Activities Section */}
          <ActivitiesSection
            isLoading={isLoading}
            error={error}
            successMessage={successMessage}
            activityHoursThreshold={settings.activityHoursThreshold ?? 20}
            activityRoleRecognition={settings.activityRoleRecognition ?? undefined}
            onSaveRoles={handleSaveActivityRecognition}
            onSaveThreshold={handleSaveActivityThreshold}
          />

          {/* Change Password */}
          <ChangePasswordSection />
        </div>
      </div>
    </div>
  );
};

export default SystemManagerSettingsRefactored;
