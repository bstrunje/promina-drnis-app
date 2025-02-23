import { SystemSettings } from '../shared/types/settings.types.js';

export const validateSettings = (settings: Partial<SystemSettings>): string | null => {
  if (settings.renewalStartDay && (settings.renewalStartDay < 1 || settings.renewalStartDay > 31)) {
    return 'Renewal start day must be between 1 and 31';
  }
  if (settings.cardNumberLength && (settings.cardNumberLength < 1 || settings.cardNumberLength > 10)) {
    return 'Card number length must be between 1 and 10';
  }
  if (settings.renewalStartMonth && (settings.renewalStartMonth < 1 || settings.renewalStartMonth > 12)) {
    return 'Renewal start month must be between 1 and 12';
  }
  return null;
};