import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Member } from '@shared/member';

interface RoleAssignmentModalProps {
  member: Member;
  onClose: () => void;
  onAssign: (memberId: number, newRole: 'member' | 'member_administrator' | 'member_superuser') => void;
}

const RoleAssignmentModal: React.FC<RoleAssignmentModalProps> = ({ member, onClose, onAssign }) => {
  const { t } = useTranslation();
  const [selectedRole, setSelectedRole] = useState<'member' | 'member_administrator' | 'member_superuser'>(member.role ?? 'member');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAssign(member.member_id, selectedRole);
  };

  return (
    // Dodan z-50 kako bi modal bio iznad ostalih elemenata sučelja
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
          {t('roleAssignment.title', { name: `${member.first_name} ${member.last_name}` })}
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">{t('roleAssignment.form.role')}</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as 'member' | 'member_administrator' | 'member_superuser')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="member">{t('roleAssignment.form.member')}</option>
              <option value="member_administrator">{t('roleAssignment.form.administrator')}</option>
              <option value="member_superuser">{t('roleAssignment.form.superuser')}</option>
            </select>
          </div>
          <div className="mt-4 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              {t('roleAssignment.buttons.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {t('roleAssignment.buttons.assignRole')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoleAssignmentModal;