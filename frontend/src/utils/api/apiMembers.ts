import api from './apiConfig';
import { Member } from '../../../shared/types/member.js';
import { ApiMemberActivity, ApiUploadProfileImageResult, ApiMemberWithEquipment } from './apiTypes';
import { AxiosResponse } from 'axios';

interface MemberWithFunction {
  member_id: number;
  full_name: string;
  functions_in_society: string;
}

interface MemberWithSkill {
  member_id: number;
  full_name: string;
}

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
 * Dohvaćanje samo aktivnih članova
 * @returns Lista aktivnih članova
 */
export const getActiveMembers = async (): Promise<Member[]> => {
  try {
    const response: AxiosResponse<Member[]> = await api.get('/members?status=active');
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Nije moguće dohvatiti popis aktivnih članova');
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
    
    const response: AxiosResponse<ApiUploadProfileImageResult> = await api.post(`/members/${memberId}/profile-image`, formData, {
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

/**
 * Dohvaća članove koji su primili određenu opremu
 */
export const getMembersWithEquipment = async (equipmentType: string, size: string, gender: string): Promise<ApiMemberWithEquipment[]> => {
  try {
    const response: AxiosResponse<ApiMemberWithEquipment[]> = await api.get(`/members/equipment/members/${equipmentType}/${size}/${gender}`);
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to fetch members with ${equipmentType} equipment`);
  }
};

/**
 * Dohvaća članove s funkcijama u društvu
 */
export const getMembersWithFunctions = async (): Promise<MemberWithFunction[]> => {
  try {
    const response: AxiosResponse<MemberWithFunction[]> = await api.get('/members/functions');
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Nije moguće dohvatiti članove s funkcijama');
  }
};

/**
 * Dohvaća članove po određenoj vještini
 */
export const getMembersBySkill = async (skillName: string): Promise<MemberWithSkill[]> => {
  try {
    const response: AxiosResponse<MemberWithSkill[]> = await api.get(`/members/skills/${encodeURIComponent(skillName)}`);
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Nije moguće dohvatiti članove po vještini');
  }
};
