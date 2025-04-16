import db from '../utils/db.js';
import { AdminPermissions } from '../shared/types/permissions.js';

const permissionsService = {
  async getAdminPermissions(memberId: number): Promise<AdminPermissions> {
    const result = await db.query(
      'SELECT can_manage_end_reasons FROM admin_permissions WHERE member_id = $1',
      [memberId]
    );

    return result.rows[0] || { can_manage_end_reasons: false };
  },

  async updateAdminPermissions(
    memberId: number, 
    permissions: AdminPermissions,
    grantedBy: number
  ): Promise<void> {
    // Prvo provjerimo postoji li već zapis
    const existingPermission = await db.query(
      'SELECT permission_id FROM admin_permissions WHERE member_id = $1',
      [memberId]
    );

    if (existingPermission.rows.length === 0) {
      // Ako ne postoji, radimo INSERT
      await db.query(
        `INSERT INTO admin_permissions 
         (member_id, can_manage_end_reasons, granted_by) 
         VALUES ($1, $2, $3)`,
        [memberId, permissions.can_manage_end_reasons, grantedBy]
      );
    } else {
      // Ako postoji, radimo UPDATE
      await db.query(
        `UPDATE admin_permissions 
         SET can_manage_end_reasons = $1,
             granted_by = $2,
             granted_at = CURRENT_TIMESTAMP
         WHERE member_id = $3`,
        [permissions.can_manage_end_reasons, grantedBy, memberId]
      );
    }
  }
};

export default permissionsService;
