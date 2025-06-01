import db from '../utils/db.js';
import { MemberPermissions } from '../shared/types/permissions.js';

const permissionsService = {
  async getMemberPermissions(memberId: number): Promise<MemberPermissions> {
    // Selektiramo sve ovlasti iz tablice
    const result = await db.query(
      `SELECT 
        can_view_members, can_edit_members, can_add_members, can_manage_membership,
        can_view_activities, can_create_activities, can_approve_activities,
        can_view_financials, can_manage_financials,
        can_send_group_messages, can_manage_all_messages,
        can_view_statistics, can_export_data,
        can_manage_end_reasons, can_manage_card_numbers, can_assign_passwords
       FROM member_permissions 
       WHERE member_id = $1`,
      [memberId]
    );

    // Ako ne postoje ovlasti, vraćamo prazni objekt
    return result.rows[0] || {};
  },

  // Ostavljen za podršku legacy koda koji još koristi staru metodu
  async getAdminPermissions(memberId: number): Promise<MemberPermissions> {
    return this.getMemberPermissions(memberId);
  },

  async getAllMembersWithPermissions() {
    // Prilagodi upit prema strukturi tvoje baze!
    const result = await db.query(`
      SELECT m.member_id, m.first_name, m.last_name, m.email, mp.*
      FROM members m
      INNER JOIN member_permissions mp ON m.member_id = mp.member_id
      ORDER BY m.last_name, m.first_name
    `);
    return result.rows;
  },

  async updateMemberPermissions(
    memberId: number, 
    permissions: MemberPermissions,
    grantedBy: number
  ): Promise<void> {
    // Prvo provjerimo postoji li već zapis
    const existingPermission = await db.query(
      'SELECT permission_id FROM member_permissions WHERE member_id = $1',
      [memberId]
    );

    // Pripremamo objekt sa svim ovlastima, defaultno na false
    const permissionValues = {
      can_view_members: permissions.can_view_members || false,
      can_edit_members: permissions.can_edit_members || false,
      can_add_members: permissions.can_add_members || false,
      can_manage_membership: permissions.can_manage_membership || false,
      
      can_view_activities: permissions.can_view_activities || false,
      can_create_activities: permissions.can_create_activities || false,
      can_approve_activities: permissions.can_approve_activities || false,
      
      can_view_financials: permissions.can_view_financials || false,
      can_manage_financials: permissions.can_manage_financials || false,
      
      can_send_group_messages: permissions.can_send_group_messages || false,
      can_manage_all_messages: permissions.can_manage_all_messages || false,
      
      can_view_statistics: permissions.can_view_statistics || false,
      can_export_data: permissions.can_export_data || false,
      
      can_manage_end_reasons: permissions.can_manage_end_reasons || false,
      can_manage_card_numbers: permissions.can_manage_card_numbers || false,
      can_assign_passwords: permissions.can_assign_passwords || false
    };

    if (existingPermission.rows.length === 0) {
      // Ako ne postoji, radimo INSERT
      await db.query(
        `INSERT INTO member_permissions (
          member_id, granted_by, 
          can_view_members, can_edit_members, can_add_members, can_manage_membership,
          can_view_activities, can_create_activities, can_approve_activities,
          can_view_financials, can_manage_financials,
          can_send_group_messages, can_manage_all_messages,
          can_view_statistics, can_export_data,
          can_manage_end_reasons, can_manage_card_numbers, can_assign_passwords,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW()
        )`,
        [
          memberId, grantedBy, 
          permissionValues.can_view_members, permissionValues.can_edit_members, 
          permissionValues.can_add_members, permissionValues.can_manage_membership,
          permissionValues.can_view_activities, permissionValues.can_create_activities, 
          permissionValues.can_approve_activities,
          permissionValues.can_view_financials, permissionValues.can_manage_financials,
          permissionValues.can_send_group_messages, permissionValues.can_manage_all_messages,
          permissionValues.can_view_statistics, permissionValues.can_export_data,
          permissionValues.can_manage_end_reasons, permissionValues.can_manage_card_numbers, 
          permissionValues.can_assign_passwords
        ]
      );
    } else {
      // Ako već postoji, radimo UPDATE
      await db.query(
        `UPDATE member_permissions SET 
          can_view_members = $1, can_edit_members = $2, 
          can_add_members = $3, can_manage_membership = $4,
          can_view_activities = $5, can_create_activities = $6, 
          can_approve_activities = $7,
          can_view_financials = $8, can_manage_financials = $9,
          can_send_group_messages = $10, can_manage_all_messages = $11,
          can_view_statistics = $12, can_export_data = $13,
          can_manage_end_reasons = $14, can_manage_card_numbers = $15,
          can_assign_passwords = $16,
          granted_by = $17, updated_at = NOW()
         WHERE member_id = $18`,
        [
          permissionValues.can_view_members, permissionValues.can_edit_members, 
          permissionValues.can_add_members, permissionValues.can_manage_membership,
          permissionValues.can_view_activities, permissionValues.can_create_activities, 
          permissionValues.can_approve_activities,
          permissionValues.can_view_financials, permissionValues.can_manage_financials,
          permissionValues.can_send_group_messages, permissionValues.can_manage_all_messages,
          permissionValues.can_view_statistics, permissionValues.can_export_data,
          permissionValues.can_manage_end_reasons, permissionValues.can_manage_card_numbers, 
          permissionValues.can_assign_passwords,
          grantedBy, memberId
        ]
      );
    }
  },

  // Ostavljen za podršku legacy koda koji još koristi staru metodu
  async updateAdminPermissions(
    memberId: number, 
    permissions: MemberPermissions,
    grantedBy: number
  ): Promise<void> {
    console.log('Korištenje legacy metode updateAdminPermissions za člana ID:', memberId);
    console.log('Primljene ovlasti:', permissions);
    return this.updateMemberPermissions(memberId, permissions, grantedBy);
  }
};

export default permissionsService;
