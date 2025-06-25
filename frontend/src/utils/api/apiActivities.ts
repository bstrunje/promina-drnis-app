import apiInstance from './apiConfig';
import { Activity, ActivityType } from '@shared/activity.types';

/**
 * Dohvaća sve tipove aktivnosti.
 * @returns Promise koji razrješava u polje tipova aktivnosti.
 */
export const getActivityTypes = async (): Promise<ActivityType[]> => {
  const response = await apiInstance.get<ActivityType[]>('/activities/types');
  return response.data;
};

/**
 * Dohvaća specifični tip aktivnosti po ID-u.
 * @param typeId ID tipa aktivnosti.
 * @returns Promise koji razrješava u objekt tipa aktivnosti.
 */
export const getActivityTypeById = async (typeId: number): Promise<ActivityType> => {
  const response = await apiInstance.get<ActivityType>(`/activities/types/${typeId}`);
  return response.data;
};

/**
 * Dohvaća sve aktivnosti za određeni tip (kategoriju).
 * @param typeId ID tipa aktivnosti.
 * @returns Promise koji razrješava u polje aktivnosti.
 */
export const getActivitiesByTypeId = async (typeId: number): Promise<Activity[]> => {
  const response = await apiInstance.get<Activity[]>(`/activities/category/${typeId}`);
  return response.data;
};
