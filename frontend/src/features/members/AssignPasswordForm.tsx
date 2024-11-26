// src/features/members/AssignPasswordForm.tsx
import React, { useState } from 'react';
import { Member } from '@shared/types';
import { API_URL } from '../../utils/config';

interface Props {
  member: Member;
  onClose: () => void;
  onAssign: (updatedMember: Member) => void;
}

const AssignPasswordForm: React.FC<Props> = ({ member, onClose, onAssign }) => {
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/members/${member.member_id}/assign-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password })
      });

      if (!response.ok) {
        throw new Error('Failed to assign password');
      }

      const updatedMember = await response.json();
      onAssign(updatedMember);
    } catch (error) {
      console.error('Error assigning password:', error);
      // Handle error (e.g., show an error message to the user)
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Assign Password</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter new password"
            className="w-full p-2 mb-4 border rounded"
            required
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md mr-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-md"
            >
              Assign Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignPasswordForm;