// backend/src/config/permissions.config.ts
import { MemberPermissions } from '../shared/types/permissions.js';

/**
 * Zadane ovlasti za ulogu 'member_administrator'.
 * Ove se ovlasti primjenjuju ako član s tom ulogom nema eksplicitno definirane ovlasti u bazi podataka.
 * Ovo omogućuje centralizirano upravljanje osnovnim administratorskim ovlastima.
 */
export const defaultAdminPermissions: Readonly<MemberPermissions> = {
  can_view_members: true,
  can_edit_members: true,
  can_add_members: true,
  can_manage_membership: true,
  can_view_activities: true,
  can_create_activities: true,
  can_approve_activities: true,
  can_view_financials: true,
  can_manage_financials: true,
  can_send_group_messages: true,
  can_manage_all_messages: false, // Samo superuser može brisati sve poruke
  can_view_statistics: true,
  can_export_data: true,
  can_manage_end_reasons: true,
  can_manage_card_numbers: true,
  can_assign_passwords: true,
};
