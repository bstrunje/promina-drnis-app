import React, { useState } from 'react';
import { Member } from '@shared/types/member';

interface RoleAssignmentModalProps {
  member: Member;
  onClose: () => void;
  onAssign: (memberId: number, newRole: 'member' | 'admin' | 'superuser') => void;
}

const RoleAssignmentModal: React.FC<RoleAssignmentModalProps> = ({ member, onClose, onAssign }) => {
  const [selectedRole, setSelectedRole] = useState<'member' | 'admin' | 'superuser'>(member.role);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAssign(member.member_id, selectedRole);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
          Assign Role to {member.first_name} {member.last_name}
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as 'member' | 'admin' | 'superuser')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="superuser">Superuser</option>
            </select>
          </div>
          <div className="mt-4 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Assign Role
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoleAssignmentModal;