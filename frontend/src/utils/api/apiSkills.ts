import apiClient from './apiConfig';
import { ApiUsedSkill } from './apiTypes';

/**
 * Dohvaća sve vještine za trenutnu organizaciju
 */
export const getSkills = async () => {
  const response = await apiClient.get('/skills');
  return response.data as unknown[];
};

/**
 * Dohvaća samo vještine koje barem jedan član ima
 */
export const getUsedSkills = async (): Promise<ApiUsedSkill[]> => {
  const response = await apiClient.get('/skills/used');
  return response.data as ApiUsedSkill[];
};
