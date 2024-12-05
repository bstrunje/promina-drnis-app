import React, { useState } from 'react';
import { Member } from '@shared/types/member';
import { assignPassword } from '../../utils/api';

function isAxiosError(error: any): error is Error & { response?: { data?: { message?: string } }; request?: any } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    'request' in error
  );
}

interface Props {
  member: Member;
  onClose: () => void;
  onAssign: (updatedMember: Member) => void;
}

const AssignPasswordForm: React.FC<Props> = ({ member, onClose, onAssign }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    console.log('Submitting password assignment for member:', member.member_id);
    try {
      await assignPassword(member.member_id, password);
      console.log('Password assigned successfully');
      onAssign(member);
      onClose();
    } catch (error: unknown) {
      console.error('Error assigning password:', error);
      if (isAxiosError(error)) {
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          setError(`Failed to assign password: ${error.response.data?.message || error.message}`);
        } else if (error.request) {
          // The request was made but no response was received
          setError('No response received from server. Please try again.');
        } else {
          // Something happened in setting up the request that triggered an Error
          setError(`Error: ${error.message}`);
        }
      } else if (error instanceof Error) {
        setError(`An error occurred: ${error.message}`);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Assign Password for {member.first_name} {member.last_name}</h3>
        {error && <p className="text-red-500 mb-4">{error}</p>}
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