import api from './apiConfig';
import { AuditLog } from '../../../shared/types/audit.js';
import { ApiCleanupTestDataResult } from './apiTypes';
import { AxiosResponse } from 'axios';

export interface PaginatedAuditLogsResponse {
  logs: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Dohvaćanje audit logova s paginacijom
 * @param page - Broj stranice (default: 1)
 * @param limit - Broj logova po stranici (default: 50)
 * @returns Paginirani audit logovi
 */
export const getAuditLogs = async (page: number = 1, limit: number = 50): Promise<PaginatedAuditLogsResponse> => {
  try {
    const response: AxiosResponse<PaginatedAuditLogsResponse> = await api.get('/audit/logs', {
      params: { page, limit }
    });
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
