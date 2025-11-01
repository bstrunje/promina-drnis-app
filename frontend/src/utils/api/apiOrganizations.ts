// frontend/src/utils/api/apiOrganizations.ts
import systemManagerApi from '../../features/systemManager/utils/systemManagerApi';

export interface Organization {
  id: number;
  name: string;
  short_name: string | null;
  subdomain: string;
  email: string;
  phone: string | null;
  website_url: string | null;
  street_address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  logo_path: string | null;
  primary_color: string;
  secondary_color: string;
  default_language: string;
  ethics_code_url: string | null;
  privacy_policy_url: string | null;
  membership_rules_url: string | null;
  member_limit: number | null;
  is_donor: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  _count?: {
    members: number;
    activities: number;
    activity_types?: number;
    skills?: number;
  } | null;
  system_manager?: {
    id: number;
    username: string;
    email: string;
    display_name: string;
    two_factor_enabled?: boolean;
    two_factor_preferred_channel?: string;
    two_factor_confirmed_at?: string;
  } | null;
}

export interface CreateOrganizationData {
  // Organization data
  default_language?: string;
  name: string;
  short_name?: string;
  subdomain: string;
  email: string;
  phone?: string;
  website_url?: string;
  street_address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  primary_color?: string;
  secondary_color?: string;
  ethics_code_url?: string;
  privacy_policy_url?: string;
  membership_rules_url?: string;
  
  // System Manager data
  sm_username: string;
  sm_email: string;
  sm_display_name: string;
  sm_password: string;
  
  // System Manager 2FA data
  sm_enable_2fa?: boolean;
  sm_pin?: string;
  sm_pin_confirm?: string;
}

export interface UpdateOrganizationData {
  name?: string;
  short_name?: string;
  email?: string;
  phone?: string;
  website_url?: string;
  street_address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  primary_color?: string;
  secondary_color?: string;
  default_language?: string;
  ethics_code_url?: string;
  privacy_policy_url?: string;
  membership_rules_url?: string;
  member_limit?: number | null;
  is_donor?: boolean;
  is_active?: boolean;
  // System Manager data (optional)
  sm_username?: string;
  sm_email?: string;
  sm_display_name?: string;
  sm_password?: string;
}

/**
 * Provjera dostupnosti subdomene
 */
export const checkSubdomainAvailability = async (subdomain: string): Promise<{ available: boolean; subdomain: string }> => {
  const response = await systemManagerApi.get<{ available: boolean; subdomain: string }>('/system-manager/organizations/check-subdomain', {
    params: { subdomain }
  });
  return response.data;
};

/**
 * Reset credentials for an organization's System Manager
 */
export const resetOrganizationManagerCredentials = async (organizationId: number): Promise<{ message: string }> => {
  const response = await systemManagerApi.post<{ message: string }>(`/system-manager/organizations/${organizationId}/reset-credentials`);
  return response.data;
};

/**
 * Kreiranje nove organizacije (samo globalni System Manager)
 */
export const createOrganization = async (data: CreateOrganizationData): Promise<{ success: boolean; organization: Organization; message: string }> => {
  const response = await systemManagerApi.post<{ success: boolean; organization: Organization; message: string }>('/system-manager/organizations', data);
  return response.data;
};

/**
 * Dohvat svih organizacija (samo globalni System Manager)
 */
export const getAllOrganizations = async (): Promise<{ organizations: Organization[] }> => {
  const response = await systemManagerApi.get<{ organizations: Organization[] }>('/system-manager/organizations');
  return response.data;
};

/**
 * Dohvat pojedinačne organizacije
 */
export const getOrganizationById = async (id: number): Promise<{ organization: Organization }> => {
  const response = await systemManagerApi.get<{ organization: Organization }>(`/system-manager/organizations/${id}`);
  return response.data;
};

/**
 * Ažuriranje organizacije
 */
export const updateOrganization = async (id: number, data: UpdateOrganizationData): Promise<{ success: boolean; organization: Organization; message: string }> => {
  const response = await systemManagerApi.put<{ success: boolean; organization: Organization; message: string }>(`/system-manager/organizations/${id}`, data);
  return response.data;
};

/**
 * Brisanje organizacije (samo globalni System Manager)
 */
export const deleteOrganization = async (id: number): Promise<{ success: boolean; message: string }> => {
  const response = await systemManagerApi.delete<{ success: boolean; message: string }>(`/system-manager/organizations/${id}`);
  return response.data;
};
