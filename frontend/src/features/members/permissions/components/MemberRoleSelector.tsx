// features/members/permissions/components/MemberRoleSelector.tsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MemberRole } from '@shared/member';
import { updateMemberRole } from '../api/memberPermissionsApi';

interface MemberRoleSelectorProps {
  memberId: number;
  currentRole?: MemberRole;
  onRoleChange?: (newRole: MemberRole) => void;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const MemberRoleSelector: React.FC<MemberRoleSelectorProps> = ({
  memberId,
  currentRole = 'member',
  onRoleChange,
  onSuccess,
  onError
}) => {
  const { t } = useTranslation('members');
  // Inicijalno stanje iz currentRole; promjene currentRole syncamo u useEffect ispod
  const [selectedRole, setSelectedRole] = useState<MemberRole>(currentRole);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    setSelectedRole(currentRole);
  }, [currentRole]);

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as MemberRole;
    setSelectedRole(newRole);
    if (onRoleChange) {
      onRoleChange(newRole);
    }
  };

  const handleSaveRole = async () => {
    if (selectedRole === currentRole) {
      return; // Nema promjene
    }

    try {
      setSaving(true);
      await updateMemberRole(memberId, selectedRole);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('[MemberRoleSelector] change role error:', err);
      if (onError) {
        onError(err instanceof Error ? err.message : t('memberRole.changeError'));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
      <h3 className="text-md font-semibold mb-3">{t('memberRole.title')}</h3>
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-grow">
          <select
            value={selectedRole}
            onChange={handleRoleChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            disabled={saving}
          >
            <option value="member">{t('roles.member')}</option>
            <option value="member_administrator">{t('roles.admin')}</option>
            <option value="member_superuser">{t('roles.superuser')}</option>
          </select>
        </div>
        <div>
          <button
            onClick={() => { void handleSaveRole(); }}
            disabled={saving || selectedRole === currentRole}
            className={`px-4 py-2 rounded-md ${
              saving || selectedRole === currentRole
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {saving ? t('saving', { ns: 'common' }) : t('memberRole.changeRole')}
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-600 mt-2">
        <strong>{t('roles.member')}:</strong> {t('memberRole.descriptions.member')}<br />
        <strong>{t('roles.admin')}:</strong> {t('memberRole.descriptions.admin')}<br />
        <strong>{t('roles.superuser')}:</strong> {t('memberRole.descriptions.superuser')}
      </p>
    </div>
  );
};

export default MemberRoleSelector;
