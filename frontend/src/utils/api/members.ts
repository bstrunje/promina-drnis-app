import api from './config';
import { Member } from '../../../shared/types/member.js';
import { ApiMemberActivity } from './types';
import { AxiosResponse } from 'axios';

/**
 * Dohvaćanje svih članova
 * @returns Lista svih članova
 */
export const getAllMembers = async (): Promise<Member[]> => {
  try {
    const response: AxiosResponse<Member[]> = await api.get('/members');
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Nije moguće dohvatiti popis svih članova');
  }
};

/**
 * Upload profilne slike člana
 * @param memberId ID člana
 * @param imageFile Datoteka slike
 * @returns Putanja do uploadane slike
 */
export const uploadProfileImage = async (memberId: number, imageFile: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    interface UploadImageResponse {
      success: boolean;
      message: string;
      imagePath: string;
    }
    
    const response: AxiosResponse<UploadImageResponse> = await api.post(`/members/${memberId}/profile-image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.imagePath;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to upload image');
  }
};

/**
 * Dohvaćanje aktivnosti člana
 * @param memberId ID člana
 * @returns Lista aktivnosti člana
 */
export const getMemberActivities = async (memberId: number): Promise<ApiMemberActivity[]> => {
  try {
    const response: AxiosResponse<ApiMemberActivity[]> = await api.get(`/members/${memberId}/activities`);
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch member activities');
  }
};
