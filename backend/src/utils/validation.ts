import { SystemSettings } from '@shared/settings.types';

export const validateSettings = (settings: Partial<SystemSettings>): string | null => {
  if (settings.renewalStartDay && (settings.renewalStartDay < 1 || settings.renewalStartDay > 30)) {
    return 'Renewal start day must be between 1 and 30';
  }
  if (settings.cardNumberLength && (settings.cardNumberLength < 1 || settings.cardNumberLength > 10)) {
    return 'Card number length must be between 1 and 10';
  }
  return null;
};