import { SystemSettings } from '../shared/types/settings.types.js';

export const sanitizeInput = (input: Partial<SystemSettings>): Partial<SystemSettings> => {
  return {
    cardNumberLength: input.cardNumberLength ? Math.floor(Number(input.cardNumberLength)) : undefined,
    renewalStartDay: input.renewalStartDay ? Math.floor(Number(input.renewalStartDay)) : undefined,
    renewalStartMonth: input.renewalStartMonth ? Math.floor(Number(input.renewalStartMonth)) : undefined
  };
};