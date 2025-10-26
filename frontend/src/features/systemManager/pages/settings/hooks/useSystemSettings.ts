// features/systemManager/pages/settings/hooks/useSystemSettings.ts
import { useState, useEffect } from 'react';
import axios from 'axios';
import { SystemSettings } from '@shared/settings';
import { getSystemSettings, updateSystemSettings } from '../../../utils/systemManagerApi';

// Lokalni tip - koristi SystemSettings direktno
export type LocalSystemSettings = SystemSettings;

interface UseSystemSettingsReturn {
  settings: LocalSystemSettings;
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
  saveAllSettings: () => Promise<void>;
  savePartialSettings: (partialSettings: Partial<LocalSystemSettings>) => Promise<void>;
  updateLocalSettings: (updates: Partial<LocalSystemSettings>) => void;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleRolesChange: (roles: string[]) => void;
  handlePermissionsChange: (permissions: string[]) => void;
  setError: (error: string | null) => void;
  setSuccessMessage: (message: string | null) => void;
  setSettings: React.Dispatch<React.SetStateAction<LocalSystemSettings>>;
}

export const useSystemSettings = (): UseSystemSettingsReturn => {
  const [settings, setSettings] = useState<LocalSystemSettings>({
    id: "default",
    cardNumberLength: 5,
    renewalStartMonth: 11,
    renewalStartDay: 1,
    membershipTerminationMonth: 12,
    membershipTerminationDay: 31,
    timeZone: 'Europe/Zagreb',
    backupFrequency: 'daily',
    backupRetentionDays: 30,
    backupStorageLocation: './backups',
    registrationRateLimitEnabled: true,
    registrationWindowMs: 60 * 60 * 1000,
    registrationMaxAttempts: 5,
    twoFactorGlobalEnabled: false,
    twoFactorMembersEnabled: false,
    twoFactorRequiredMemberRoles: [],
    twoFactorRequiredMemberPermissions: [],
    twoFactorOtpExpirySeconds: 300,
    twoFactorRememberDeviceDays: 30,
    twoFactorChannelEmailEnabled: false,
    twoFactorChannelSmsEnabled: false,
    twoFactorChannelTotpEnabled: false,
    twoFactorChannelPinEnabled: false,
    twoFactorTrustedDevicesEnabled: false,
    passwordGenerationStrategy: 'FULLNAME_ISK_CARD',
    passwordSeparator: '-isk-',
    passwordCardDigits: 4,
    activityHoursThreshold: 20,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Učitaj postavke pri inicijalizaciji
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const data = await getSystemSettings();
        console.log('[SETTINGS] Loaded settings:', data);
        setSettings(data);
        
        // Postavi default vrijednosti za polja koja možda nedostaju
        data.registrationRateLimitEnabled ??= true;
        data.registrationWindowMs ??= 60 * 60 * 1000;
        data.registrationMaxAttempts ??= 5;
        data.twoFactorGlobalEnabled ??= false;
        data.twoFactorMembersEnabled ??= false;
        data.twoFactorRequiredMemberRoles ??= [];
        data.twoFactorRequiredMemberPermissions ??= [];
        data.twoFactorOtpExpirySeconds ??= 300;
        data.twoFactorRememberDeviceDays ??= 30;
        data.twoFactorChannelEmailEnabled ??= false;
        data.twoFactorChannelSmsEnabled ??= false;
        data.twoFactorChannelTotpEnabled ??= true;
        data.twoFactorChannelPinEnabled ??= false;
        data.twoFactorTrustedDevicesEnabled ??= false;
        data.passwordGenerationStrategy ??= 'FULLNAME_ISK_CARD';
        data.passwordSeparator ??= '-isk-';
        data.passwordCardDigits ??= 4;
        data.activityHoursThreshold ??= 20;
      } catch (err: unknown) {
        let errorMessage: string;
        if (axios.isAxiosError(err)) {
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

    void loadSettings();
  }, []);

  // Funkcija za spremanje svih postavki
  const saveAllSettings = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await updateSystemSettings(settings);
      
      // Refetch podatke iz baze da osiguramo konzistentnost
      const freshSettings = await getSystemSettings();
      setSettings(freshSettings);
      
      // Emit custom event za invalidaciju globalnog cache-a
      window.dispatchEvent(new CustomEvent('systemSettingsUpdated', { 
        detail: freshSettings 
      }));
      
      setSuccessMessage("Settings successfully updated!");
      
      // Automatski sakrij poruku nakon 5 sekundi
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(`Error updating settings: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Funkcija za spremanje samo određenih polja (partial update)
  const savePartialSettings = async (partialSettings: Partial<LocalSystemSettings>) => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Merge partial settings s trenutnim settings
      const updatedSettings = { ...settings, ...partialSettings };
      
      await updateSystemSettings(updatedSettings);
      
      // Refetch podatke iz baze
      const freshSettings = await getSystemSettings();
      setSettings(freshSettings);
      
      // Emit custom event za invalidaciju globalnog cache-a
      window.dispatchEvent(new CustomEvent('systemSettingsUpdated', { 
        detail: freshSettings 
      }));
      
      setSuccessMessage("Settings successfully updated!");
      
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(`Error updating settings: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Funkcija za ažuriranje lokalnog state-a
  const updateLocalSettings = (updates: Partial<LocalSystemSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  // onChange handler kompatibilan sa starim kodom
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      console.log(`[SETTINGS] Checkbox ${name} changed to:`, checked);
      setSettings(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      const numValue = parseInt(value);
      setSettings(prev => ({ ...prev, [name]: numValue }));
    } else {
      setSettings(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handler za promjenu 2FA Required Roles
  const handleRolesChange = (roles: string[]) => {
    setSettings(prev => ({ ...prev, twoFactorRequiredMemberRoles: roles }));
  };

  // Handler za promjenu 2FA Required Permissions
  const handlePermissionsChange = (permissions: string[]) => {
    setSettings(prev => ({ ...prev, twoFactorRequiredMemberPermissions: permissions }));
  };

  return {
    settings,
    isLoading,
    error,
    successMessage,
    saveAllSettings,
    savePartialSettings,
    updateLocalSettings,
    handleChange,
    handleRolesChange,
    handlePermissionsChange,
    setError,
    setSuccessMessage,
    setSettings
  };
};
