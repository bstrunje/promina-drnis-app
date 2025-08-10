// features/members/permissions/EditMemberPermissionsModal.tsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { AdminPermissionsModel } from '@shared/systemManager';
import { getMemberPermissions, updateMemberPermissions } from './api/memberPermissionsApi';
import { X } from 'lucide-react';
import MemberRoleSelector from './components/MemberRoleSelector';
import { MemberRole } from '@shared/member';

interface Member {
  member_id: number;
  full_name: string;
  email?: string;
  role?: MemberRole;
}

interface EditMemberPermissionsModalProps {
  member: Member;
  onClose: () => void;
  onSave: () => void;
}

const EditMemberPermissionsModal: React.FC<EditMemberPermissionsModalProps> = ({
  member,
  onClose,
  onSave
}) => {
  const { t } = useTranslation('members');
  // Početne prazne ovlasti - koristi useMemo da objekt bude stabilan između rendera
  const emptyPermissions = React.useMemo<AdminPermissionsModel>(() => ({
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
  }), []);

  const [permissions, setPermissions] = useState<AdminPermissionsModel>(emptyPermissions);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // const [roleUpdateSuccess, setRoleUpdateSuccess] = useState<boolean>(false); // uklonjeno jer se ne koristi

// Funkcija za grupiranje ovlasti po kategorijama
function categorizePermissions(permissions: AdminPermissionsModel, t: TFunction) {
  return [
    {
      name: t('permissions.categories.membership'),
      permissions: [
        { key: 'can_view_members', label: t('permissions.labels.can_view_members'), value: permissions.can_view_members },
        { key: 'can_edit_members', label: t('permissions.labels.can_edit_members'), value: permissions.can_edit_members },
        { key: 'can_add_members', label: t('permissions.labels.can_add_members'), value: permissions.can_add_members },
        { key: 'can_manage_membership', label: t('permissions.labels.can_manage_membership'), value: permissions.can_manage_membership },
      ]
    },
    {
      name: t('permissions.categories.activities'),
      permissions: [
        { key: 'can_view_activities', label: t('permissions.labels.can_view_activities'), value: permissions.can_view_activities },
        { key: 'can_create_activities', label: t('permissions.labels.can_create_activities'), value: permissions.can_create_activities },
        { key: 'can_approve_activities', label: t('permissions.labels.can_approve_activities'), value: permissions.can_approve_activities },
      ]
    },
    {
      name: t('permissions.categories.finances'),
      permissions: [
        { key: 'can_view_financials', label: t('permissions.labels.can_view_financials'), value: permissions.can_view_financials },
        { key: 'can_manage_financials', label: t('permissions.labels.can_manage_financials'), value: permissions.can_manage_financials },
      ]
    },
    {
      name: t('permissions.categories.messages'),
      permissions: [
        { key: 'can_send_group_messages', label: t('permissions.labels.can_send_group_messages'), value: permissions.can_send_group_messages },
        { key: 'can_manage_all_messages', label: t('permissions.labels.can_manage_all_messages'), value: permissions.can_manage_all_messages },
      ]
    },
    {
      name: t('permissions.categories.other'),
      permissions: [
        { key: 'can_view_statistics', label: t('permissions.labels.can_view_statistics'), value: permissions.can_view_statistics },
        { key: 'can_export_data', label: t('permissions.labels.can_export_data'), value: permissions.can_export_data },
        { key: 'can_manage_end_reasons', label: t('permissions.labels.can_manage_end_reasons'), value: permissions.can_manage_end_reasons },
        { key: 'can_manage_card_numbers', label: t('permissions.labels.can_manage_card_numbers'), value: permissions.can_manage_card_numbers },
        { key: 'can_assign_passwords', label: t('permissions.labels.can_assign_passwords'), value: permissions.can_assign_passwords },
      ]
    }
  ];
}

// Kategorije za prikaz u UI-u (dinamički)
const permissionCategories = categorizePermissions(permissions, t);

// --- OVDJE NASTAVLJA OSTATak KODA (predlošci, useEffect, itd.) ---

  const permissionTemplates = [
    {
      name: t('permissions.templates.fullAdmin'),
      template: {
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
      }
    },
    {
      name: t('permissions.templates.operational'),
      template: {
        can_view_members: true,
        can_edit_members: true,
        can_add_members: false,
        can_manage_membership: false,
        can_view_activities: true,
        can_create_activities: true,
        can_approve_activities: false,
        can_view_financials: false,
        can_manage_financials: false,
        can_send_group_messages: true,
        can_manage_all_messages: false,
        can_view_statistics: true,
        can_export_data: false,
        can_manage_end_reasons: false,
        can_manage_card_numbers: false,
        can_assign_passwords: false
      }
    },
    {
      name: 'Samo pregled',
      template: {
        can_view_members: true,
        can_edit_members: false,
        can_add_members: false,
        can_manage_membership: false,
        can_view_activities: true,
        can_create_activities: false,
        can_approve_activities: false,
        can_view_financials: true,
        can_manage_financials: false,
        can_send_group_messages: false,
        can_manage_all_messages: false,
        can_view_statistics: true,
        can_export_data: false,
        can_manage_end_reasons: false,
        can_manage_card_numbers: false,
        can_assign_passwords: false
      }
    }
  ];

  // Učitavanje postojećih ovlasti
  useEffect(() => {
    const fetchMemberPermissions = async () => {
      try {
        setLoading(true);
        const data = await getMemberPermissions(member.member_id);
        
        if (data) {
          setPermissions(data);
        } else {
          // Ako član nema nikakve ovlasti, postavi prazne ovlasti
          setPermissions(emptyPermissions);
        }
        
        setError(null);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Došlo je do greške prilikom dohvata ovlasti člana.');
        }
      } finally {
        setLoading(false);
      }
    };

    void fetchMemberPermissions(); // void zbog lint pravila
  }, [member.member_id, emptyPermissions]);

  // Handler za promjenu pojedinačne ovlasti
  const handlePermissionChange = (key: keyof AdminPermissionsModel) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Handler za primjenu predloška
  const applyTemplate = (template: Partial<AdminPermissionsModel>) => {
    setPermissions(prev => ({
      ...prev,
      ...template
    }));
  };

  // Handler za poništavanje svih ovlasti
  const clearAllPermissions = () => {
    setPermissions(emptyPermissions);
  };

  // Handler za spremanje ovlasti
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      // Osiguramo da imamo samo boolean vrijednosti za ovlasti
      // Bez reference na članove, datum i ostale podatke
      const permissionsOnly = {
        can_view_members: Boolean(permissions.can_view_members),
        can_edit_members: Boolean(permissions.can_edit_members),
        can_add_members: Boolean(permissions.can_add_members),
        can_manage_membership: Boolean(permissions.can_manage_membership),
        can_view_activities: Boolean(permissions.can_view_activities),
        can_create_activities: Boolean(permissions.can_create_activities),
        can_approve_activities: Boolean(permissions.can_approve_activities),
        can_view_financials: Boolean(permissions.can_view_financials),
        can_manage_financials: Boolean(permissions.can_manage_financials),
        can_send_group_messages: Boolean(permissions.can_send_group_messages),
        can_manage_all_messages: Boolean(permissions.can_manage_all_messages),
        can_view_statistics: Boolean(permissions.can_view_statistics),
        can_export_data: Boolean(permissions.can_export_data),
        can_manage_end_reasons: Boolean(permissions.can_manage_end_reasons),
        can_manage_card_numbers: Boolean(permissions.can_manage_card_numbers),
        can_assign_passwords: Boolean(permissions.can_assign_passwords)
      };
      
      console.log('Permissions format before API call:', { 
        member_id: member.member_id,
        permissions: permissionsOnly
      });
      
      const updateData = {
        member_id: member.member_id,
        permissions: permissionsOnly
      };
      
      await updateMemberPermissions(updateData);
      
      setSuccessMessage('Ovlasti člana su uspješno ažurirane.');
      
      // Nakon kratke pauze, zatvori modal i osvježi listu
      setTimeout(() => {
        onSave();
        onClose();
      }, 1500);
      
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Došlo je do greške prilikom spremanja ovlasti.');
      }
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">{t('permissions.editMemberPermissionsTitle')}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-grow">
          {/* Rola člana - vidljivo samo superuserima */}
          {member.role && (
            <MemberRoleSelector
              memberId={member.member_id}
              currentRole={member.role}
              onSuccess={() => {
                setSuccessMessage('Rola člana je uspješno ažurirana.');
                // Nakon kratke pauze, zatvori modal i osvježi listu
                setTimeout(() => {
                  onSave();
                  onClose();
                }, 1500);
              }}
              onError={(errorMsg) => {
                setError(errorMsg);
              }}
            />
          )}
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
              <p className="mt-2 text-gray-600">{t('permissions.loadingPermissions')}</p>
            </div>
          ) : error && !successMessage ? (
            <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4">
              {error}
            </div>
          ) : successMessage ? (
            <div className="bg-green-100 text-green-700 p-4 rounded-md mb-4">
              {successMessage}
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900">{member.full_name}</h3>
                <p className="text-sm text-gray-600">{member.email ?? t('members:noEmail')}</p>
              </div>

              {/* Predlošci ovlasti */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">{t('permissions.templatesTitle')}</h4>
                <div className="flex flex-wrap gap-2">
                  {permissionTemplates.map((template, index) => (
                    <button
                      key={index}
                      onClick={() => applyTemplate(template.template)}
                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-sm rounded-md text-gray-700"
                    >
                      {template.name}
                    </button>
                  ))}
                  <button
                    onClick={clearAllPermissions}
                    className="px-3 py-1 bg-red-100 hover:bg-red-200 text-sm rounded-md text-red-700"
                  >
                    {t('permissions.clearAll')}
                  </button>
                </div>
              </div>

              {/* Kategorije ovlasti */}
              <div className="space-y-6">
                {permissionCategories.map((category, categoryIndex) => (
                  <div key={categoryIndex} className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">{category.name}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {category.permissions.map((perm, permIndex) => (
                        <div key={permIndex} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`perm-${categoryIndex}-${permIndex}`}
                            checked={permissions[perm.key as keyof AdminPermissionsModel]}
                            onChange={() => handlePermissionChange(perm.key as keyof AdminPermissionsModel)}
                            className="h-4 w-4 text-blue-600 rounded"
                          />
                          <label
                            htmlFor={`perm-${categoryIndex}-${permIndex}`}
                            className="ml-2 text-sm text-gray-700"
                          >
                            {perm.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            disabled={saving}
          >
            {t('cancel', { ns: 'common'})}
          </button>
          <button
            onClick={() => { void handleSave(); }}
            className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
              saving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
            disabled={saving || loading}
          >
            {saving ? t('saving', { ns: 'common'}) : t('permissions.savePermissions')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditMemberPermissionsModal;
