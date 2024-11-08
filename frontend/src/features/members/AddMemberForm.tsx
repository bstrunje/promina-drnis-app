import React, { useState } from 'react';
import { Member } from '@/types/member';

interface AddMemberFormProps {
  onClose: () => void;
  onAdd: (member: Member) => void;
}

const AddMemberForm: React.FC<AddMemberFormProps> = ({ onClose, onAdd }) => {
  const [member, setMember] = useState<Omit<Member, 'member_id'>>({
    first_name: '',
    last_name: '',
    join_date: new Date().toISOString().split('T')[0],
    membership_type: 'active',
    phone: '',
    emergency_contact: '',
    total_hours: 0,
    notes: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setMember(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({ ...member, member_id: Date.now() } as Member);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Add New Member</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="first_name"
            value={member.first_name}
            onChange={handleChange}
            placeholder="First Name"
            className="mt-2 p-2 w-full border rounded"
            required
          />
          <input
            type="text"
            name="last_name"
            value={member.last_name}
            onChange={handleChange}
            placeholder="Last Name"
            className="mt-2 p-2 w-full border rounded"
            required
          />
          <input
            type="date"
            name="join_date"
            value={member.join_date}
            onChange={handleChange}
            className="mt-2 p-2 w-full border rounded"
            required
          />
          <select
            name="membership_type"
            value={member.membership_type}
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
            value={member.phone}
            onChange={handleChange}
            placeholder="Phone"
            className="mt-2 p-2 w-full border rounded"
          />
          <input
            type="text"
            name="emergency_contact"
            value={member.emergency_contact}
            onChange={handleChange}
            placeholder="Emergency Contact"
            className="mt-2 p-2 w-full border rounded"
          />
          <input
            type="number"
            name="total_hours"
            value={member.total_hours}
            onChange={handleChange}
            placeholder="Total Hours"
            className="mt-2 p-2 w-full border rounded"
          />
          <textarea
            name="notes"
            value={member.notes}
            onChange={handleChange}
            placeholder="Notes"
            className="mt-2 p-2 w-full border rounded"
          />
          <div className="mt-4">
            <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              Add Member
            </button>
            <button type="button" onClick={onClose} className="ml-2 px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMemberForm;