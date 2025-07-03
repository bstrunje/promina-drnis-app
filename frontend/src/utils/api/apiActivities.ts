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
  // Dodajemo include=participants parametar za dohvat podataka o sudionicima
  // potrebne za izračun ukupnih sati
  const response = await apiInstance.get<Activity[]>(`/activities/type/${typeId}?include=participants`);
  return response.data;
};

/**
 * Dohvaća sve aktivnosti.
 * @returns Promise koji razrješava u polje aktivnosti.
 */
export const getAllActivities = async (): Promise<Activity[]> => {
  // Dodajemo include=participants query parametar kako bismo dobili i podatke o sudionicima
  // potrebne za izračun ukupnih sati
  const response = await apiInstance.get('/activities?include=participants');
  return response.data;
};

/**
 * Dohvaća jednu aktivnost po njenom ID-u.
 * @param activityId ID aktivnosti.
 * @returns Promise koji razrješava u objekt aktivnosti.
 */
export const getActivityById = async (activityId: string): Promise<Activity> => {
  // Dodajemo include=participants parametar za dohvat podataka o sudionicima
  // potrebne za izračun ukupnih sati
  const response = await apiInstance.get<Activity>(`/activities/${activityId}?include=participants`);
  return response.data;
};

/**
 * Ažurira postojeću aktivnost.
 * @param id ID aktivnosti.
 * @param activityData Podaci za ažuriranje.
 * @returns Promise koji razrješava u ažurirani objekt aktivnosti.
 */
// Definiramo tip koji isključuje manual_hours iz ActivityData
type ActivityUpdateData = Partial<Omit<Activity, 'participants'>> & {
  participant_ids?: number[];
};

/**
 * Ažurira postojeću aktivnost.
 * @param id ID aktivnosti.
 * @param activityData Podaci za ažuriranje (ne uključuje manual_hours jer to nije dio Activity modela).
 * @returns Promise koji razrješava u ažurirani objekt aktivnosti.
 */
export const updateActivity = async (id: number, activityData: ActivityUpdateData): Promise<Activity> => {
  const response = await apiInstance.put<Activity>(`/activities/${id}`, activityData);
  return response.data;
};

/**
 * Kreira novu aktivnost.
 * @param activityData Podaci za kreiranje aktivnosti.
 * @returns Promise koji razrješava u objekt kreirane aktivnosti.
 */
export const createActivity = async (activityData: {
  name: string;
  description: string;
  start_date: Date;
  actual_start_time: Date | null;
  actual_end_time: Date | null;
  activity_type_id: number;
  recognition_percentage: number;
  participant_ids?: number[];
  manual_hours?: number | null; // Dodano - bit će primijenjeno na sudionike aktivnosti
}): Promise<Activity> => {
  const response = await apiInstance.post<Activity>('/activities', activityData);
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

export const cancelActivity = async (activityId: number, cancellation_reason: string) => {
  const response = await apiInstance.patch(`/activities/${activityId}/cancel`, { cancellation_reason });
  return response.data;
};

export const deleteActivity = async (activityId: number) => {
  const response = await apiInstance.delete(`/activities/${activityId}`);
  return response.data;
};
