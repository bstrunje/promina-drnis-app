export interface AdminPermissions {
  can_manage_end_reasons: boolean;
}

export interface PermissionUpdate {
  memberId: number;
  permissions: Partial<AdminPermissions>;
}
