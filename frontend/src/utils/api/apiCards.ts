import api from './apiConfig';
import { ApiCardNumbersResult, ApiDeleteCardNumberResult, ApiAssignCardNumberResult, ApiSyncCardNumberStatusResult } from './apiTypes';
import { AxiosResponse } from 'axios';

/**
 * Dohvaćanje duljine broja iskaznice
 * @returns Duljina broja iskaznice
 */
export const getCardNumberLength = async (): Promise<number> => {
  try {
    interface CardLengthResponse {
      cardNumberLength: number;
    }
    const response: AxiosResponse<CardLengthResponse> = await api.get('/settings/card-length');
    return response.data.cardNumberLength;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch card number length setting');
  }
};

/**
 * Ažuriranje duljine broja iskaznice
 * @param length Nova duljina broja iskaznice
 */
export const updateCardNumberLength = async (length: number): Promise<void> => {
  try {
    interface UpdateCardLengthResponse {
      success: boolean;
      message: string;
    }
    await api.put<UpdateCardLengthResponse>('/settings/card-length', { length });
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to update card number length');
  }
};

/**
 * Dohvaćanje dostupnih brojeva iskaznica
 * @returns Lista dostupnih brojeva iskaznica
 */
export const getAvailableCardNumbers = async (): Promise<string[]> => {
  try {
    // Dodana eksplicitna provjera statusa
    const response: AxiosResponse<string[]> = await api.get('/card-numbers/available');
    
    // Osiguraj da je response.data array, a ako nije, vrati prazan array
    if (!Array.isArray(response.data)) {
      console.warn('API response for available card numbers is not an array:', response.data);
      return [];
    }
    
    return response.data;
  } catch (error) {
    console.error("API: Error fetching card numbers:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch card numbers');
  }
};

/**
 * Dodavanje broja iskaznice
 * @param cardNumber Broj iskaznice
 */
export const addCardNumber = async (cardNumber: string): Promise<void> => {
  try {
    interface AddCardNumberResponse {
      success: boolean;
      message: string;
    }
    await api.post<AddCardNumberResponse>('/card-numbers', { cardNumber });
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to add card number');
  }
};

/**
 * Dodavanje raspona brojeva iskaznica
 * @param start Početni broj
 * @param end Završni broj
 */
export const addCardNumberRange = async (start: number, end: number): Promise<void> => {
  try {
    interface AddCardNumberRangeResponse {
      success: boolean;
      message: string;
      addedCount?: number;
    }
    await api.post<AddCardNumberRangeResponse>('/card-numbers/range', { start, end });
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to add card number range');
  }
};

/**
 * Dohvaćanje svih brojeva iskaznica
 * @returns Svi brojevi iskaznica i statistika
 */
export const getAllCardNumbers = async (): Promise<ApiCardNumbersResult> => {
  try {
    const response: AxiosResponse<ApiCardNumbersResult> = await api.get('/card-numbers');
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch all card numbers');
  }
};

/**
 * Brisanje broja iskaznice
 * @param cardNumber Broj iskaznice
 * @returns Rezultat brisanja broja iskaznice
 */
export const deleteCardNumber = async (cardNumber: string): Promise<ApiDeleteCardNumberResult> => {
  try {
    const response: AxiosResponse<ApiDeleteCardNumberResult> = await api.delete(`/card-numbers/${cardNumber}`);
    return response.data;
  } catch (error) {
    console.error('API error deleting card number:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to delete card number');
  }
};

/**
 * Sinkronizacija statusa brojeva iskaznica
 * @returns Rezultat sinkronizacije
 */
export const syncCardNumberStatus = async (): Promise<ApiSyncCardNumberStatusResult> => {
  try {
    const response: AxiosResponse<ApiSyncCardNumberStatusResult> = await api.post('/card-numbers/sync');
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to sync card number status');
  }
};

/**
 * Dodjeljivanje broja iskaznice članu
 * @param memberId ID člana
 * @param cardNumber Broj iskaznice
 * @returns Rezultat dodjeljivanja broja iskaznice
 */
export const assignCardNumber = async (memberId: number, cardNumber: string): Promise<ApiAssignCardNumberResult> => {
  try {
    const response: AxiosResponse<ApiAssignCardNumberResult> = await api.post(`/members/${memberId}/card-number`, { cardNumber });
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to assign card number');
  }
};
