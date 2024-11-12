import React, { useState } from 'react';
import { Member } from '@shared/types';

interface EditMemberFormProps {
  member: Member;
  onClose: () => void;
  onEdit: (member: Member) => void;
}

const EditMemberForm: React.FC<EditMemberFormProps> = ({ member, onClose, onEdit }) => {
  const [editedMember, setEditedMember] = useState<Member>({...member});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedMember(prev => ({
      ...prev,
      [name]: name === 'total_hours' ? Number(value) : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onEdit(editedMember);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Edit Member</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="first_name"
            value={editedMember.first_name}
            onChange={handleChange}
            placeholder="First Name"
            className="mt-2 p-2 w-full border rounded"
            required
          />
          <input
            type="text"
            name="last_name"
            value={editedMember.last_name}
            onChange={handleChange}
            placeholder="Last Name"
            className="mt-2 p-2 w-full border rounded"
            required
          />
          <input
            type="date"
            name="join_date"
            value={editedMember.join_date.split('T')[0]}
            onChange={handleChange}
            className="mt-2 p-2 w-full border rounded"
            required
          />
          <select
            name="membership_type"
            value={editedMember.membership_type}
            onChange={handleChange}
            className="mt-2 p-2 w-full border rounded"
            required
          >
            <option value="active">Active</option>
            <option value="passive">Passive</option>
          </select>
          <input
            type="tel"
            name="phone"
            value={editedMember.phone || ''}
            onChange={handleChange}
            placeholder="Phone"
            className="mt-2 p-2 w-full border rounded"
          />
          <input
            type="text"
            name="emergency_contact"
            value={editedMember.emergency_contact || ''}
            onChange={handleChange}
            placeholder="Emergency Contact"
            className="mt-2 p-2 w-full border rounded"
          />
          <input
            type="number"
            name="total_hours"
            value={editedMember.total_hours || 0}
            onChange={handleChange}
            placeholder="Total Hours"
            className="mt-2 p-2 w-full border rounded"
          />
          <textarea
            name="notes"
            value={editedMember.notes || ''}
            onChange={handleChange}
            placeholder="Notes"
            className="mt-2 p-2 w-full border rounded"
          />
          <div className="mt-4">
            <button 
              type="submit" 
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Update Member
            </button>
            <button 
              type="button" 
              onClick={onClose} 
              className="ml-2 px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMemberForm;