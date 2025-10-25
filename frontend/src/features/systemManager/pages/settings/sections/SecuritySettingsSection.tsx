// features/systemManager/pages/settings/sections/SecuritySettingsSection.tsx
import React from 'react';
import { Save } from 'lucide-react';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { MultiSelect } from '../components/MultiSelect';
import { LocalSystemSettings } from '../hooks/useSystemSettings';

// Constants for roles and permissions
const MEMBER_ROLES = [
  { value: 'member_superuser', label: 'Superuser' },
  { value: 'member_administrator', label: 'Administrator' }
];

const MEMBER_PERMISSIONS = [
  { value: 'canViewMembers', label: 'View Members' },
  { value: 'canEditMembers', label: 'Edit Members' },
  { value: 'canAddMembers', label: 'Add Members' },
  { value: 'canManageMembership', label: 'Manage Membership' },
  { value: 'canViewActivities', label: 'View Activities' },
  { value: 'canCreateActivities', label: 'Create Activities' },
  { value: 'canApproveActivities', label: 'Approve Activities' },
  { value: 'canViewFinancials', label: 'View Financials' },
  { value: 'canManageFinancials', label: 'Manage Financials' },
  { value: 'canSendGroupMessages', label: 'Send Group Messages' },
  { value: 'canManageAllMessages', label: 'Manage All Messages' },
  { value: 'canViewStatistics', label: 'View Statistics' },
  { value: 'canExportData', label: 'Export Data' },
  { value: 'canManageEndReasons', label: 'Manage End Reasons' },
  { value: 'canManageCardNumbers', label: 'Manage Card Numbers' },
  { value: 'canAssignPasswords', label: 'Assign Passwords' }
];

interface SecuritySettingsSectionProps {
  settings: LocalSystemSettings;
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onRolesChange: (roles: string[]) => void;
  onPermissionsChange: (permissions: string[]) => void;
  onSave: () => Promise<void>;
}

export const SecuritySettingsSection: React.FC<SecuritySettingsSectionProps> = ({
  settings,
  isLoading,
  error,
  successMessage,
  onChange,
  onRolesChange,
  onPermissionsChange,
  onSave
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void onSave();
  };

  // UI rules: Global vs Roles/Permissions are mutually exclusive in UI
  const isGlobalOn = Boolean(settings.twoFactorGlobalEnabled);
  const isMembersOn = Boolean(settings.twoFactorMembersEnabled);
  const disableGlobalToggle = isMembersOn;
  const disableMembersControls = isGlobalOn || !isMembersOn;

  return (
    <CollapsibleSection title="Security Settings" defaultOpen={false}>
      <form onSubmit={handleSubmit} className="space-y-6 mt-4">
        
        {/* Global 2FA Toggle */}
        <div className="mb-4 flex items-center justify-between">
          <label className="block text-gray-700 text-sm font-bold">Enable 2FA globally</label>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="twoFactorGlobalEnabled"
              checked={Boolean(settings.twoFactorGlobalEnabled)}
              onChange={onChange}
              disabled={disableGlobalToggle}
              className="sr-only peer"
            />
            <div className="relative w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
          </label>
        </div>
        {disableGlobalToggle && (
          <p className="text-xs text-gray-500 mb-4">Global 2FA is disabled because Roles/Permissions 2FA is active.</p>
        )}

        {/* Members 2FA Toggle */}
        <div className="mb-4 flex items-center justify-between">
          <label className="block text-gray-700 text-sm font-bold">Enable 2FA for members by roles/permissions</label>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="twoFactorMembersEnabled"
              checked={Boolean(settings.twoFactorMembersEnabled)}
              onChange={onChange}
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
                onChange={onChange}
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
                onChange={onChange}
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
                onChange={onChange}
                className="sr-only peer"
              />
              <div className="relative w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            </label>
          </div>
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded border">
            <span className="text-sm font-medium text-gray-700">Enable PIN 2FA</span>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="twoFactorChannelPinEnabled"
                checked={Boolean(settings.twoFactorChannelPinEnabled)}
                onChange={onChange}
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
                onChange={onChange}
                className="sr-only peer"
              />
              <div className="relative w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            </label>
          </div>
        </div>

        {/* Required Roles and Permissions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Required Roles</label>
            <MultiSelect
              options={MEMBER_ROLES}
              selectedValues={settings.twoFactorRequiredMemberRoles ?? []}
              onChange={onRolesChange}
              placeholder="Select member roles..."
              disabled={disableMembersControls}
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
            <label className="block text-gray-700 text-sm font-bold mb-2">Required Permissions</label>
            <MultiSelect
              options={MEMBER_PERMISSIONS}
              selectedValues={settings.twoFactorRequiredMemberPermissions ?? []}
              onChange={onPermissionsChange}
              placeholder="Select member permissions..."
              disabled={disableMembersControls}
            />
            <p className="text-sm text-gray-500 mt-1">Apply 2FA if member has any of these permissions set to true.</p>
            {disableMembersControls && (
              <p className="text-xs text-gray-500 mt-1">
                {isGlobalOn
                  ? 'Disabled while Global 2FA is enabled.'
                  : 'Disabled until "Enable 2FA for members by roles/permissions" is turned on.'}
              </p>
            )}
          </div>
        </div>

        {/* OTP Expiry and Remember Device */}
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
          {isLoading ? 'Saving...' : 'Save Security Settings'}
        </button>
      </form>
    </CollapsibleSection>
  );
};
