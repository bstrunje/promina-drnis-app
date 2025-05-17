import api from './apiConfig';
import { AuditLog } from '../../../shared/types/audit.js';
import { ApiCleanupTestDataResult } from './apiTypes';
import { AxiosResponse } from 'axios';

/**
 * Dohvaćanje audit logova
 * @returns Lista audit logova
 */
export const getAuditLogs = async (): Promise<AuditLog[]> => {
  try {
    const response: AxiosResponse<AuditLog[]> = await api.get('/audit/logs');
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch audit logs');
  }
};

/**
 * Čišćenje testnih podataka
 * @returns Rezultat čišćenja testnih podataka
 */
export const cleanupTestData = async (): Promise<ApiCleanupTestDataResult> => {
  try {
    const response: AxiosResponse<ApiCleanupTestDataResult> = await api.post('debug/cleanup-test-data');
    console.log('🧹 Testni podaci uspješno očišćeni:', response.data);
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Greška prilikom čišćenja testnih podataka');
  }
};
