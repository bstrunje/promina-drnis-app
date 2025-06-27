import apiInstance from './apiConfig';
import { Activity, ActivityType, ActivityParticipation } from '@shared/activity.types';

/**
 * Dohvaća sve tipove aktivnosti.
 * @returns Promise koji razrješava u polje tipova aktivnosti.
 */
export const getActivityTypes = async (): Promise<ActivityType[]> => {
  const response = await apiInstance.get<ActivityType[]>('/activities/types');
  return response.data;
};

/**
 * Dohvaća sve aktivnosti za određeni tip.
 * @param typeId ID tipa aktivnosti.
 * @returns Promise koji razrješava u polje aktivnosti.
 */
export const getActivitiesByTypeId = async (typeId: string): Promise<Activity[]> => {
  const response = await apiInstance.get<Activity[]>(`/activities/type/${typeId}`);
  return response.data;
};

// --- Admin Activity Management ---

export const getAllActivitiesAdmin = async (): Promise<Activity[]> => {
  const response = await apiInstance.get<Activity[]>('/activities-management');
  return response.data;
};

export const getActivityByIdAdmin = async (id: number): Promise<Activity> => {
  const response = await apiInstance.get<Activity>(`/activities-management/${id}`);
  return response.data;
};

export const createActivityAdmin = async (activityData: Omit<Activity, 'activity_id' | 'created_at' | 'updated_at'>): Promise<Activity> => {
  const response = await apiInstance.post<Activity>('/activities-management', activityData);
  return response.data;
};

export const updateActivityAdmin = async (id: number, activityData: Partial<Activity>): Promise<Activity> => {
  const response = await apiInstance.put<Activity>(`/activities-management/${id}`, activityData);
  return response.data;
};

export const deleteActivityAdmin = async (id: number): Promise<void> => {
  await apiInstance.delete(`/activities-management/${id}`);
};

export const addParticipantAdmin = async (activityId: number, memberId: number): Promise<ActivityParticipation> => {
  const response = await apiInstance.post<ActivityParticipation>(`/activities-management/${activityId}/participants/${memberId}`);
  return response.data;
};

export const removeParticipantAdmin = async (activityId: number, memberId: number): Promise<void> => {
  await apiInstance.delete(`/activities-management/${activityId}/participants/${memberId}`);
};

export const updateParticipationAdmin = async (participationId: number, data: Partial<ActivityParticipation>): Promise<ActivityParticipation> => {
  const response = await apiInstance.put<ActivityParticipation>(`/activities-management/participants/${participationId}`, data);
  return response.data;
};
