// frontend/src/utils/api/apiAdmin.ts
import api from './apiConfig';
import { AxiosResponse } from 'axios';

interface SyncMemberStatusesResponse {
  success: boolean;
  message: string;
  updatedCount: number;
}

/**
 * API funkcije za administratorske operacije
 */
const apiAdmin = {
  /**
   * Sinkronizira statuse članova na temelju postojanja broja iskaznice
   * @returns Informacije o uspješnosti sinkronizacije i broj ažuriranih članova
   */
  syncMemberStatuses: async (): Promise<SyncMemberStatusesResponse> => {
    try {
      const response: AxiosResponse<SyncMemberStatusesResponse> = await api.post<SyncMemberStatusesResponse>(
        '/admin/sync-member-statuses'
      );
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Greška pri sinkronizaciji statusa članova. Pokušajte ponovno.');
    }
  }
};

export default apiAdmin;
