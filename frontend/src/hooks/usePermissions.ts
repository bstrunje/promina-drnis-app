// hooks/usePermissions.ts
import { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import { AdminPermissionsModel } from '@shared/systemManager';
import api from '../utils/api/apiConfig';

/**
 * Hook za provjeru korisničkih dozvola
 * Dohvaća dozvole za trenutno prijavljenog korisnika
 */
export const usePermissions = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<AdminPermissionsModel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!user) {
        setPermissions(null);
        setLoading(false);
        return;
      }

      // Ako je superuser, ima sve dozvole
      if (user.role === 'member_superuser') {
        setPermissions({
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
          can_manage_all_messages: true,
          can_view_statistics: true,
          can_export_data: true,
          can_manage_end_reasons: true,
          can_manage_card_numbers: true,
          can_assign_passwords: true
        });
        setLoading(false);
        return;
      }

      // Za ostale korisnike, dohvati dozvole iz API-ja
      try {
        const response = await api.get<AdminPermissionsModel>(`/admin/permissions/${user.member_id}`);
        
        if (response.data) {
          setPermissions(response.data);
        } else {
          // Ako nema dozvola ili greška, postavi prazne dozvole
          setPermissions({
            can_view_members: false,
            can_edit_members: false,
            can_add_members: false,
            can_manage_membership: false,
            can_view_activities: false,
            can_create_activities: false,
            can_approve_activities: false,
            can_view_financials: false,
            can_manage_financials: false,
            can_send_group_messages: false,
            can_manage_all_messages: false,
            can_view_statistics: false,
            can_export_data: false,
            can_manage_end_reasons: false,
            can_manage_card_numbers: false,
            can_assign_passwords: false
          });
        }
      } catch (error) {
        console.error('Error fetching permissions:', error);
        setPermissions(null);
      } finally {
        setLoading(false);
      }
    };

    void fetchPermissions();
  }, [user]);

  /**
   * Provjeri ima li korisnik određenu dozvolu
   */
  const hasPermission = (permission: keyof AdminPermissionsModel): boolean => {
    if (!user) return false;
    
    // Superuser ima sve dozvole
    if (user.role === 'member_superuser') return true;
    
    // Administrator ima sve dozvole osim ako nisu eksplicitno isključene
    if (user.role === 'member_administrator') {
      return permissions ? permissions[permission] !== false : true;
    }
    
    // Obični članovi imaju samo eksplicitno dodijeljene dozvole
    return permissions ? permissions[permission] === true : false;
  };

  /**
   * Provjeri ima li korisnik bilo koju od navedenih dozvola
   */
  const hasAnyPermission = (permissionList: (keyof AdminPermissionsModel)[]): boolean => {
    return permissionList.some(permission => hasPermission(permission));
  };

  /**
   * Provjeri ima li korisnik sve navedene dozvole
   */
  const hasAllPermissions = (permissionList: (keyof AdminPermissionsModel)[]): boolean => {
    return permissionList.every(permission => hasPermission(permission));
  };

  return {
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions
  };
};
