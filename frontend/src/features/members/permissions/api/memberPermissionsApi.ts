import axios from 'axios';
import { API_BASE_URL } from '../../../../utils/config';
import { AdminPermissionsModel, MemberWithPermissions, UpdateMemberPermissionsDto } from '@shared/systemManager';
import { Member, MemberRole } from '@shared/member';

const memberPermissionsApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

memberPermissionsApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getMembersWithPermissions = async (): Promise<MemberWithPermissions[]> => {
  const response = await memberPermissionsApi.get('/members/permissions');
  return response.data;
};

export const getMemberPermissions = async (memberId: number): Promise<AdminPermissionsModel | null> => {
  const response = await memberPermissionsApi.get(`/members/permissions/${memberId}`);
  return response.data;
};

export const updateMemberPermissions = async (updateData: UpdateMemberPermissionsDto): Promise<void> => {
  await memberPermissionsApi.put(`/members/permissions/${updateData.member_id}`, updateData);
};

export const removeMemberPermissions = async (memberId: number): Promise<void> => {
  await memberPermissionsApi.delete(`/members/${memberId}/permissions`);
};

/**
 * Ažurira rolu člana
 * @param memberId ID člana
 * @param role Nova rola (member, member_administrator, member_superuser)
 * @returns Ažurirani član
 */
export const updateMemberRole = async (memberId: number, role: MemberRole): Promise<Member> => {
  const response = await memberPermissionsApi.put(`/members/${memberId}/role`, { role });
  return response.data;
};

export default memberPermissionsApi;
