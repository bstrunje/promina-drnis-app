import api from './apiConfig';
import { SystemSettings } from '@shared/settings';

/**
 * Member-friendly API za dohvaćanje system settings
 * Koristi običan member API umjesto System Manager API-ja
 */

/**
 * Dohvaća system settings za trenutnu organizaciju
 * Dostupno svim prijavljenim članovima
 */
export const getSystemSettings = async (): Promise<SystemSettings> => {
  try {
    const response = await api.get<SystemSettings>('/settings');
    return response.data;
  } catch (error) {
    console.error('Error fetching system settings:', error);
    throw error;
  }
};
