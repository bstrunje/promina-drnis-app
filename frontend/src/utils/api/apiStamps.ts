import api from './apiConfig';
import { ApiStampHistoryItem, ApiStampResetResult, ApiArchiveResult, ApiMemberWithStamp } from './apiTypes';
import { AxiosResponse } from 'axios';

/**
 * Dohvaćanje povijesti markica
 * @returns Lista povijesti markica
 */
export const getStampHistory = async (): Promise<ApiStampHistoryItem[]> => {
  try {
    const response: AxiosResponse<ApiStampHistoryItem[]> = await api.get('/stamps/history');
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch stamp history');
  }
};

/**
 * Dohvaćanje povijesti markica za određenu godinu
 * @param year Godina
 * @returns Lista povijesti markica za određenu godinu
 */
export const getStampHistoryByYear = async (year: number): Promise<ApiStampHistoryItem[]> => {
  try {
    const response: AxiosResponse<ApiStampHistoryItem[]> = await api.get(`/stamps/history/${year}`);
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to fetch stamp history for year ${year}`);
  }
};

/**
 * Resetiranje inventara markica
 * @param year Godina
 * @param notes Bilješke
 * @returns Rezultat resetiranja inventara markica
 */
export const resetStampInventory = async (year: number, notes = ''): Promise<ApiStampResetResult> => {
  try {
    const response: AxiosResponse<ApiStampResetResult> = await api.post('/stamps/reset-year', { year, notes });
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to reset stamp inventory');
  }
};

/**
 * Arhiviranje inventara markica
 * @param year Godina
 * @param notes Bilješke
 * @param force Prisilno arhiviranje
 * @returns Rezultat arhiviranja inventara markica
 */
export const archiveStampInventory = async (year: number, notes = '', force = false): Promise<ApiArchiveResult> => {
  try {
    const response: AxiosResponse<ApiArchiveResult> = await api.post('/stamps/archive-year', { year, notes, force });
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to archive stamp inventory');
  }
};

/**
 * Dohvaćanje članova s određenim tipom markice za godinu
 * @param stampType Tip markice (employed, student, pensioner)
 * @param year Godina
 * @returns Lista članova s izdanim markicama
 */
export const getMembersWithStamp = async (stampType: string, year: number): Promise<ApiMemberWithStamp[]> => {
  try {
    const response: AxiosResponse<ApiMemberWithStamp[]> = await api.get(`/stamps/members/${stampType}/${year}`);
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to fetch members with ${stampType} stamps for year ${year}`);
  }
};
