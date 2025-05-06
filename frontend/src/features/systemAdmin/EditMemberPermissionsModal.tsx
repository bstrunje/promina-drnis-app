// features/systemAdmin/EditMemberPermissionsModal.tsx
import React, { useState, useEffect } from 'react';
import { AdminPermissionsModel, UpdateMemberPermissionsDto } from '@shared/systemAdmin';
import { getMemberPermissions, updateMemberPermissions } from './systemAdminApi';
import { X } from 'lucide-react';

interface Member {
  member_id: number;
  full_name: string;
  email?: string;
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
  // Početne prazne ovlasti
  const emptyPermissions: AdminPermissionsModel = {
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
  };

  const [permissions, setPermissions] = useState<AdminPermissionsModel>(emptyPermissions);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Definicija kategorija ovlasti za grupiranje u UI-u
  const permissionCategories = [
    {
      name: 'Članstvo',
      permissions: [
        { key: 'can_view_members', label: 'Pregled članova' },
        { key: 'can_edit_members', label: 'Uređivanje članova' },
        { key: 'can_add_members', label: 'Dodavanje članova' },
        { key: 'can_manage_membership', label: 'Upravljanje članstvom' },
      ]
    },
    {
      name: 'Aktivnosti',
      permissions: [
        { key: 'can_view_activities', label: 'Pregled aktivnosti' },
        { key: 'can_create_activities', label: 'Kreiranje aktivnosti' },
        { key: 'can_approve_activities', label: 'Odobravanje aktivnosti' },
      ]
    },
    {
      name: 'Financije',
      permissions: [
        { key: 'can_view_financials', label: 'Pregled financija' },
        { key: 'can_manage_financials', label: 'Upravljanje financijama' },
      ]
    },
    {
      name: 'Poruke',
      permissions: [
        { key: 'can_send_group_messages', label: 'Slanje grupnih poruka' },
        { key: 'can_manage_all_messages', label: 'Upravljanje svim porukama' },
      ]
    },
    {
      name: 'Statistika i izvještaji',
      permissions: [
        { key: 'can_view_statistics', label: 'Pregled statistika' },
        { key: 'can_export_data', label: 'Izvoz podataka' },
      ]
    },
    {
      name: 'Ostalo',
      permissions: [
        { key: 'can_manage_end_reasons', label: 'Upravljanje razlozima prestanka' },
        { key: 'can_manage_card_numbers', label: 'Upravljanje brojevima iskaznica' },
        { key: 'can_assign_passwords', label: 'Dodjela lozinki' },
      ]
    }
  ];

  // Predlošci ovlasti
  const permissionTemplates = [
    {
      name: 'Puni administratorski pristup',
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
      name: 'Operativni pristup',
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

    fetchMemberPermissions();
  }, [member.member_id]);

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
      
      const updateData: UpdateMemberPermissionsDto = {
        member_id: member.member_id,
        permissions
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
          <h2 className="text-lg font-semibold">Uređivanje ovlasti za člana</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-grow">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
              <p className="mt-2 text-gray-600">Učitavanje ovlasti...</p>
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
                <p className="text-sm text-gray-600">{member.email || 'Nema email adrese'}</p>
              </div>

              {/* Predlošci ovlasti */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Predlošci ovlasti</h4>
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
                    Ukloni sve ovlasti
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
            Odustani
          </button>
          <button
            onClick={handleSave}
            className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
              saving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
            disabled={saving || loading}
          >
            {saving ? 'Spremanje...' : 'Spremi ovlasti'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditMemberPermissionsModal;
