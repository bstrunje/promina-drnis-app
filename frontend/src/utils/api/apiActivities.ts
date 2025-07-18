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
export const getActivitiesByTypeId = async (typeId: string, year?: number): Promise<Activity[]> => {
  const params = new URLSearchParams();
  // Dodajemo include=participants parametar za dohvat podataka o sudionicima
  // potrebne za izračun ukupnih sati
  params.append('include', 'participants');
  if (year) {
    params.append('year', year.toString());
  }

  const response = await apiInstance.get<Activity[]>(`/activities/type/${typeId}`, { params });
  return response.data;
};

/**
 * Dohvaća aktivnosti prema statusu.
 * @param status Status aktivnosti (npr. 'PLANNED', 'ACTIVE', 'COMPLETED').
 * @returns Promise koji razrješava u polje aktivnosti.
 */
export const getActivitiesByStatus = async (status: string): Promise<Activity[]> => {
  const response = await apiInstance.get<Activity[]>(`/activities/by-status/${status}?include=participants`);
  return response.data;
};

/**
 * Dohvaća sve aktivnosti.
 * @returns Promise koji razrješava u polje aktivnosti.
 */
export const getAllActivities = async (): Promise<Activity[]> => {
  // Standardna funkcija za dohvaćanje svih aktivnosti, koristi se gdje nije potreban
  // detaljan izračun sati s uključenim podacima o sudionicima
  const response = await apiInstance.get('/activities');
  return response.data;
};

/**
 * Dohvaća sve aktivnosti s potpunim detaljima o sudionicima (za izračun sati)
 * @returns Promise koji razrješava u polje aktivnosti s potpunim detaljima sudionika
 */
/**
 * Dohvaća sve aktivnosti za određenu godinu s potpunim detaljima o sudionicima.
 * @param year Godina za koju se dohvaćaju aktivnosti.
 * @returns Promise koji razrješava u polje aktivnosti s potpunim detaljima sudionika.
 */
export const getActivitiesByYearWithParticipants = async (year: number): Promise<Activity[]> => {
  const response = await apiInstance.get(`/activities/by-year/${year}/with-participants`);
  return response.data;
};

export const getAllActivitiesWithParticipants = async (): Promise<Activity[]> => {
  // Koristi novu specijaliziranu rutu koja vraća potpune podatke o sudionicima
  const response = await apiInstance.get('/activities/with-participants');
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
 * Tip za podatke o sudjelovanju s postotkom priznavanja za izlete
 */
interface ParticipationWithRecognition {
  member_id: number;
  recognition_override: number;
}

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
  participations?: ParticipationWithRecognition[]; // Novi parametar za sudionike s ulogama i postocima priznavanja
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

/**
 * Prijavljuje trenutnog korisnika na aktivnost.
 * @param activityId ID aktivnosti.
 * @returns Promise koji razrješava u objekt sudjelovanja.
 */
export const joinActivity = async (activityId: number): Promise<ActivityParticipation> => {
  const response = await apiInstance.post<ActivityParticipation>(`/activities/${activityId}/join`);
  return response.data;
};

/**
 * Dohvaća godišnju statistiku aktivnosti za određenog člana.
 * @param memberId ID člana.
 * @returns Promise koji razrješava u polje godišnjih statistika.
 */
export const getMemberAnnualStats = async (memberId: number) => {
  const response = await apiInstance.get(`/members/${memberId}/annual-stats`);
  return response.data;
};
