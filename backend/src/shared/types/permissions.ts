export interface MemberPermissions {
  // Ovlasti za članstvo
  can_view_members?: boolean;
  can_edit_members?: boolean;
  can_add_members?: boolean;
  can_manage_membership?: boolean;
  
  // Ovlasti za aktivnosti
  can_view_activities?: boolean;
  can_create_activities?: boolean;
  can_approve_activities?: boolean;
  
  // Financije
  can_view_financials?: boolean;
  can_manage_financials?: boolean;
  
  // Poruke
  can_send_group_messages?: boolean;
  can_manage_all_messages?: boolean;
  
  // Statistika
  can_view_statistics?: boolean;
  can_export_data?: boolean;
  
  // Specifične ovlasti
  can_manage_end_reasons?: boolean;
  can_manage_card_numbers?: boolean;
  can_assign_passwords?: boolean;
}

export interface PermissionUpdate {
  memberId: number;
  permissions: Partial<MemberPermissions>;
}
