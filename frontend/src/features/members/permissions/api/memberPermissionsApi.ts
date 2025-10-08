import axios from 'axios';
import { API_BASE_URL } from '../../../../utils/config';
import { AdminPermissionsModel, MemberWithPermissions, UpdateMemberPermissionsDto } from '@shared/systemManager';
import { Member, MemberRole } from '@shared/member';
import { getCurrentTenant } from '@/utils/tenantUtils';

// Tip za params kako bismo izbjegli any u interceptoru
type ParamsRecord = Record<string, unknown>;

const memberPermissionsApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

memberPermissionsApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Globalno dodaj tenant za ove rute (nije System Manager)
  const hasTenant = Boolean((config.params as ParamsRecord | undefined)?.tenant);
  if (!hasTenant) {
    const tenant = getCurrentTenant();
    const currentParams: ParamsRecord = (config.params as ParamsRecord | undefined) ?? {};
    config.params = { ...currentParams, tenant } as unknown; // zadržavamo kompatibilnost s Axios tipovima
  }
  return config;
});

export const getMembersWithPermissions = async (): Promise<MemberWithPermissions[]> => {
  const response = await memberPermissionsApi.get<MemberWithPermissions[]>('/members/permissions');
  return response.data;
};

export const getMemberPermissions = async (memberId: number): Promise<AdminPermissionsModel | null> => {
  const response = await memberPermissionsApi.get<AdminPermissionsModel | null>(`/members/permissions/${memberId}`);
  return response.data;
};

export const updateMemberPermissions = async (updateData: UpdateMemberPermissionsDto): Promise<void> => {
  await memberPermissionsApi.put<void>(`/members/permissions/${updateData.member_id}`, updateData);
};

export const removeMemberPermissions = async (memberId: number): Promise<void> => {
  await memberPermissionsApi.delete<void>(`/members/${memberId}/permissions`);
};

/**
 * Ažurira rolu člana
 * @param memberId ID člana
 * @param role Nova rola (member, member_administrator, member_superuser)
 * @returns Ažurirani član
 */
export const updateMemberRole = async (memberId: number, role: MemberRole): Promise<Member> => {
  const response = await memberPermissionsApi.put<Member>(`/members/${memberId}/role`, { role });
  return response.data;
};

export default memberPermissionsApi;
