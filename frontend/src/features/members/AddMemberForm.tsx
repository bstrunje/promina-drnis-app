import React, { useState } from 'react';
import { Member, MembershipTypeEnum, MemberSkill } from '@shared/member';
import { formatInputDate } from '../../utils/dateUtils';
import SkillsSelector from '@components/SkillsSelector'; // Pretpostavka putanje
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface AddMemberFormProps {
  onClose: () => void;
  onAdd: (member: Member) => void;
}

interface SizeOptions {
  value: string;
  label: string;
}

const sizeOptions: SizeOptions[] = [
  { value: 'XS', label: 'XS' },
  { value: 'S', label: 'S' },
  { value: 'M', label: 'M' },
  { value: 'L', label: 'L' },
  { value: 'XL', label: 'XL' },
  { value: 'XXL', label: 'XXL' },
  { value: 'XXXL', label: 'XXXL' }
];

const lifeStatusOptions = [
  { value: 'employed/unemployed', label: 'Employed/Unemployed' },
  { value: 'child/pupil/student', label: 'Child/Pupil/Student' },
  { value: 'pensioner', label: 'Pensioner' }
];

const genderOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' }
];

const AddMemberForm: React.FC<AddMemberFormProps> = ({ onClose, onAdd }) => {
  const { t } = useTranslation();
  const [member, setMember] = useState<Omit<Member, 'member_id'>>({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: 'male', // Default gender
    street_address: '',
    city: '',
    oib: '',
    cell_phone: '',
    email: '',
    life_status: 'employed/unemployed',
    activity_status: 'active',
    membership_type: MembershipTypeEnum.Regular,
    tshirt_size: 'M',
    shell_jacket_size: 'M',
    role: 'member',
    membership_details: {
      card_number: undefined,
      fee_payment_year: undefined,
      card_stamp_issued: undefined,
      next_year_stamp_issued: undefined,
      fee_payment_date: undefined,
      membership_status: undefined
    },
    registration_completed: false,
    total_hours: 0,
    skills: [],
    other_skills: ''
  });

  const [showSkills, setShowSkills] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'date_of_birth') {
      try {
        // Osiguravamo da je format datuma za input fields yyyy-mm-dd
        const formattedDate = formatInputDate(value);
        setMember(prev => ({ ...prev, [name]: formattedDate }));
      } catch {
        console.error("Invalid date format:", value);
        setMember(prev => ({ ...prev, [name]: value }));
      }
    } else {
      setMember(prev => ({ ...prev, [name]: value }));
    }
  };



  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({ ...member, member_id: Date.now() } as Member);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
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
            name="date_of_birth"
            value={formatInputDate(member.date_of_birth)}
            onChange={handleChange}
            className="mt-2 p-2 w-full border rounded bg-gray-50"
            required
          />
          {/* Add gender select after date of birth */}
          <select
            name="gender"
            value={member.gender}
            onChange={handleChange}
            className="mt-2 p-2 w-full border rounded bg-blue-50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
            required
          >
            {genderOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            name="street_address"
            value={member.street_address}
            onChange={handleChange}
            placeholder="Street Address"
            className="mt-2 p-2 w-full border rounded"
            required
          />
          <input
            type="text"
            name="city"
            value={member.city}
            onChange={handleChange}
            placeholder="City"
            className="mt-2 p-2 w-full border rounded"
            required
          />
          <input
            type="text"
            name="oib"
            value={member.oib}
            onChange={handleChange}
            placeholder="OIB"
            pattern="[0-9]{11}"
            title="OIB must be exactly 11 digits"
            className="mt-2 p-2 w-full border rounded"
            required
          />
          <input
            type="tel"
            name="cell_phone"
            value={member.cell_phone}
            onChange={handleChange}
            placeholder="Cell Phone"
            className="mt-2 p-2 w-full border rounded"
            required
          />
          <input
            type="email"
            name="email"
            value={member.email}
            onChange={handleChange}
            placeholder="Email"
            className="mt-2 p-2 w-full border rounded"
            required
          />
          <select
            name="life_status"
            value={member.life_status}
            onChange={handleChange}
            className="mt-2 p-2 w-full border rounded bg-blue-50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
            required
          >
            {lifeStatusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            name="tshirt_size"
            value={member.tshirt_size}
            onChange={handleChange}
            className="mt-2 p-2 w-full border rounded bg-blue-50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
            required
          >
            {sizeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            name="shell_jacket_size"
            value={member.shell_jacket_size}
            onChange={handleChange}
            className="mt-2 p-2 w-full border rounded bg-blue-50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
            required
          >
            {sizeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setShowSkills(!showSkills)}
              className="mt-1 w-full flex justify-between items-center px-3 py-2 text-left border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <span>{t('skills.title')}</span>
              {showSkills ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            {showSkills && (
              <div className="mt-2">
                <SkillsSelector
                  value={member.skills ?? []}
                  otherSkills={member.other_skills ?? ''}
                  onChange={(skills, other_skills) => 
                    setMember(prev => ({ ...prev, skills, other_skills }))
                  }
                  isEditing={true}
                />
                <p className="text-xs text-gray-500 mt-1">{t('skills.description')}</p>
              </div>
            )}
          </div>

          <div className="mt-4">
            <button 
              type="submit" 
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Add Member
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

export default AddMemberForm;