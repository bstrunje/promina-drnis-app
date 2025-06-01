import axios from 'axios';
import { API_BASE_URL } from '../../../../utils/config';
import { AdminPermissionsModel, MemberWithPermissions, UpdateMemberPermissionsDto } from '@shared/systemManager';
import { Member } from '@shared/member';

const memberPermissionsApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

memberPermissionsApi.interceptors.request.use((config) => {
  const memberToken = localStorage.getItem('memberToken');
  if (memberToken) {
    config.headers.Authorization = `Bearer ${memberToken}`;
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

export default memberPermissionsApi;
