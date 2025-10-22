import { SystemSettings } from '@shared/settings';
import { Member } from '@shared/member';
import { AdminPermissionsModel } from '@shared/systemManager';

/**
 * Provjera je li član eligible za PIN 2FA na temelju System Settings
 */
export const isPinEligible = (
  member: Member, 
  systemSettings: SystemSettings | null,
  memberPermissions?: AdminPermissionsModel | null
): boolean => {
  // Ako nema system settings, ne prikazuj PIN
  if (!systemSettings) return false;

  // Ako PIN 2FA nije uključen, ne prikazuj PIN
  if (!systemSettings.twoFactorChannelPinEnabled) return false;

  // Ako je Global 2FA uključen, svi trebaju PIN
  if (systemSettings.twoFactorGlobalEnabled) return true;

  // Ako Members 2FA nije uključen, ne prikazuj PIN
  if (!systemSettings.twoFactorMembersEnabled) return false;

  // Provjeri Required Roles
  const requiredRoles = systemSettings.twoFactorRequiredMemberRoles ?? [];
  if (requiredRoles.length > 0 && member.role && requiredRoles.includes(member.role)) {
    return true;
  }

  // Provjeri Required Permissions (ako član ima permissions)
  const requiredPermissions = systemSettings.twoFactorRequiredMemberPermissions ?? [];
  if (requiredPermissions.length > 0 && memberPermissions) {
    // Provjeri ima li član bilo koju od required permissions
    for (const permission of requiredPermissions) {
      // Mapiranje permission naziva na AdminPermissionsModel polja
      const permissionMap: Record<string, keyof AdminPermissionsModel> = {
        'canViewMembers': 'can_view_members',
        'canEditMembers': 'can_edit_members',
        'canAddMembers': 'can_add_members',
        'canManageMembership': 'can_manage_membership',
        'canViewActivities': 'can_view_activities',
        'canCreateActivities': 'can_create_activities',
        'canApproveActivities': 'can_approve_activities',
        'canViewFinancials': 'can_view_financials',
        'canManageFinancials': 'can_manage_financials',
        'canSendGroupMessages': 'can_send_group_messages',
        'canManageAllMessages': 'can_manage_all_messages',
        'canViewStatistics': 'can_view_statistics',
        'canExportData': 'can_export_data',
        'canManageEndReasons': 'can_manage_end_reasons',
        'canManageCardNumbers': 'can_manage_card_numbers',
        'canAssignPasswords': 'can_assign_passwords'
      };

      const memberPermissionField = permissionMap[permission];
      if (memberPermissionField && memberPermissions[memberPermissionField]) {
        return true;
      }
    }
  }

  return false;
};
