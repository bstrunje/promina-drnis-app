import api from './apiConfig';
import { ApiMembershipUpdateParams, ApiMembershipUpdateResult, ApiTerminateMembershipResult } from './apiTypes';
import { formatDate, getCurrentDate } from '../dateUtils';
import { AxiosResponse } from 'axios';

/**
 * Ažuriranje članstva
 * @param memberId ID člana
 * @param data Podaci za ažuriranje članstva
 * @returns Rezultat ažuriranja članstva
 */
export const updateMembership = async (
  memberId: number, 
  data: ApiMembershipUpdateParams
): Promise<ApiMembershipUpdateResult> => {
  try {
    const response: AxiosResponse<ApiMembershipUpdateResult> = await api.post(
      `/members/${memberId}/membership`,
      data,
      {
        timeout: 30000, // Increase timeout to 30 seconds
        headers: {
          'Content-Type': 'application/json'
        },
        // Add retry logic
        validateStatus: (status) => {
          return status >= 200 && status < 300;
        }
      }
    );
    return response.data;
  } catch (error) {
    // Sigurnije logiranje grešaka s eksplicitnim tipovima
    console.error('updateMembership detailed error:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    // Provjera je li greška instanca Error
    if (error instanceof Error) {
      throw new Error(`Failed to update membership: ${error.message}`);
    }
    
    // Ako nije poznata greška, bacamo generičku poruku
    throw new Error('Failed to update membership: Unknown error');
  }
};

/**
 * Prekid članstva
 * @param memberId ID člana
 * @param reason Razlog prekida članstva
 * @returns Rezultat prekida članstva
 */
export const terminateMembership = async (memberId: number, reason: string): Promise<ApiTerminateMembershipResult> => {
  try {
    const response: AxiosResponse<ApiTerminateMembershipResult> = await api.post(`/members/${memberId}/membership/terminate`, { 
      reason, 
      endDate: formatDate(getCurrentDate(), 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\''), 
    });
    return response.data;
  } catch (error) {
    // Eksplicitno bacamo Error objekt
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to terminate membership');
  }
};
