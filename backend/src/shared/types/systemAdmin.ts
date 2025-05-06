// shared/types/systemAdmin.ts

export interface SystemAdmin {
  id: number;
  username: string;
  email: string;
  display_name: string;
  last_login?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SystemAdminLoginData {
  username: string;
  password: string;
}

export interface SystemAdminLoginResponse {
  token: string;
  admin: {
    id: number;
    username: string;
    display_name: string;
  };
}

// Detaljan model za AdminPermissions koje se mogu dodijeliti članovima
export interface AdminPermissionsModel {
  // Ovlasti za članstvo
  can_view_members: boolean;
  can_edit_members: boolean;
  can_add_members: boolean;
  can_manage_membership: boolean;
  
  // Ovlasti za aktivnosti
  can_view_activities: boolean;
  can_create_activities: boolean;
  can_approve_activities: boolean;
  
  // Financije
  can_view_financials: boolean;
  can_manage_financials: boolean;
  
  // Poruke
  can_send_group_messages: boolean; 
  can_manage_all_messages: boolean;
  
  // Statistika
  can_view_statistics: boolean;
  can_export_data: boolean;
  
  // Razno
  can_manage_end_reasons: boolean;
  can_manage_card_numbers: boolean;
  can_assign_passwords: boolean;
}

// Član s pridruženim ovlastima
export interface MemberWithPermissions {
  member: {
    member_id: number;
    first_name: string;
    last_name: string;
    full_name: string;
    email?: string;
    role: string;
  };
  can_view_members: boolean;
  can_edit_members: boolean;
  can_add_members: boolean;
  can_manage_membership: boolean;
  can_view_activities: boolean;
  can_create_activities: boolean;
  can_approve_activities: boolean;
  can_view_financials: boolean;
  can_manage_financials: boolean;
  can_send_group_messages: boolean;
  can_manage_all_messages: boolean;
  can_view_statistics: boolean;
  can_export_data: boolean;
  can_manage_end_reasons: boolean;
  can_manage_card_numbers: boolean;
  can_assign_passwords: boolean;
  granted_by: number;
  granted_at: string;
}

// DTO za ažuriranje ovlasti člana
export interface UpdateMemberPermissionsDto {
  member_id: number;
  permissions: Partial<AdminPermissionsModel>;
}
