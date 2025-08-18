import { MemberPermissions } from '../shared/types/permissions.js';
import prisma from '../utils/prisma.js';
import { defaultAdminPermissions } from '../config/permissions.config.js';

const isDev = process.env.NODE_ENV === 'development';

const permissionsService = {
  async getMemberPermissions(memberId: number): Promise<MemberPermissions> {
    if (isDev) console.log(`[PERMISSIONS] Dohvaćam ovlasti za člana ${memberId}...`);
    try {
      const member = await prisma.member.findUnique({
        where: { member_id: memberId },
        select: { role: true }
      });

      const specificPermissions = await prisma.memberPermissions.findUnique({
        where: { member_id: memberId }
      });

      let finalPermissions: Partial<MemberPermissions> = {};

      if (member?.role === 'member_administrator') {
        finalPermissions = { ...defaultAdminPermissions };
      }

      if (specificPermissions) {
        for (const key in specificPermissions) {
            const permissionKey = key as keyof MemberPermissions;
            const value = specificPermissions[permissionKey];
            if (value !== null && value !== undefined) {
                finalPermissions[permissionKey] = value;
            }
        }
      }

      const allPermissionKeys = Object.keys(defaultAdminPermissions) as (keyof MemberPermissions)[];
      const result: MemberPermissions = {} as MemberPermissions;
      for (const key of allPermissionKeys) {
        result[key] = !!finalPermissions[key];
      }

      if (isDev) console.log(`[PERMISSIONS] Konačne ovlasti za člana ${memberId}:`, result);

      return result;
    } catch (error) {
      console.error(`[PERMISSIONS] Greška pri dohvaćanju ovlasti za člana ${memberId}:`, error);
      throw error;
    }
  },

  // Ostavljen za podršku legacy koda koji još koristi staru metodu
  async getAdminPermissions(memberId: number): Promise<MemberPermissions> {
    return this.getMemberPermissions(memberId);
  },

  async getAllMembersWithPermissions() {
    if (isDev) console.log('[PERMISSIONS] Dohvaćam sve članove s ovlastima...');
    try {
      const membersWithPermissions = await prisma.member.findMany({
        include: {
          permissions: true
        },
        where: {
          permissions: {
            isNot: null
          }
        },
        orderBy: [
          { last_name: 'asc' },
          { first_name: 'asc' }
        ]
      });
      
      // Flatten struktura za kompatibilnost s legacy kodom
      const result = membersWithPermissions
        .filter(member => member.permissions)
        .map(member => ({
          member_id: member.member_id,
          first_name: member.first_name,
          last_name: member.last_name,
          email: member.email,
          ...member.permissions
        }));
      
      if (isDev) console.log(`[PERMISSIONS] Pronađeno ${result.length} članova s ovlastima`);
      return result;
    } catch (error) {
      console.error('[PERMISSIONS] Greška pri dohvaćanju članova s ovlastima:', error);
      throw error;
    }
  },

  async updateMemberPermissions(
    memberId: number, 
    permissions: MemberPermissions,
    grantedBy: number
  ): Promise<void> {
    if (isDev) console.log(`[PERMISSIONS] Ažuriram ovlasti za člana ${memberId}...`);
    
    try {
      // OPTIMIZACIJA: Priprema podataka za Prisma upsert
      const permissionData = {
        member_id: memberId,
        granted_by: grantedBy,
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
        can_assign_passwords: permissions.can_assign_passwords || false,
        updated_at: new Date()
      };

      await prisma.memberPermissions.upsert({
        where: { member_id: memberId },
        update: {
          granted_by: grantedBy,
          can_view_members: permissionData.can_view_members,
          can_edit_members: permissionData.can_edit_members,
          can_add_members: permissionData.can_add_members,
          can_manage_membership: permissionData.can_manage_membership,
          can_view_activities: permissionData.can_view_activities,
          can_create_activities: permissionData.can_create_activities,
          can_approve_activities: permissionData.can_approve_activities,
          can_view_financials: permissionData.can_view_financials,
          can_manage_financials: permissionData.can_manage_financials,
          can_send_group_messages: permissionData.can_send_group_messages,
          can_manage_all_messages: permissionData.can_manage_all_messages,
          can_view_statistics: permissionData.can_view_statistics,
          can_export_data: permissionData.can_export_data,
          can_manage_end_reasons: permissionData.can_manage_end_reasons,
          can_manage_card_numbers: permissionData.can_manage_card_numbers,
          can_assign_passwords: permissionData.can_assign_passwords,
          updated_at: permissionData.updated_at
        },
        create: permissionData
      });
      
      if (isDev) console.log(`[PERMISSIONS] Uspješno ažurirane ovlasti za člana ${memberId}`);
    } catch (error) {
      console.error(`[PERMISSIONS] Greška pri ažuriranju ovlasti za člana ${memberId}:`, error);
      throw error;
    }
  },

  // Ostavljen za podršku legacy koda koji još koristi staru metodu
  async updateAdminPermissions(
    memberId: number, 
    permissions: MemberPermissions,
    grantedBy: number
  ): Promise<void> {
    if (isDev) console.log('Korištenje legacy metode updateAdminPermissions za člana ID:', memberId);
    if (isDev) console.log('Primljene ovlasti:', permissions);
    return this.updateMemberPermissions(memberId, permissions, grantedBy);
  }
};

export default permissionsService;
