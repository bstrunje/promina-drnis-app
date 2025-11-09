import React, { useState } from 'react';
const isDev = import.meta.env.DEV;
import { Member, MembershipTypeEnum } from '@shared/member';
import { formatInputDate } from '../../utils/dateUtils';
import SkillsSelector from '@components/SkillsSelector'; // Pretpostavka putanje
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useBranding } from '../../hooks/useBranding';
import { checkEmailAvailability } from '../../utils/api/apiMembers';

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

const hatSizeOptions: SizeOptions[] = [
  { value: 'L', label: 'L' },
  { value: 'XL', label: 'XL' }
];

const AddMemberForm: React.FC<AddMemberFormProps> = ({ onClose, onAdd }) => {
  const { t } = useTranslation('members');
  const { getPrimaryColor, branding } = useBranding();
  
  // Opcije za dropdown-ove - koriste postojeće ključeve
  const lifeStatusOptions = [
    { value: 'employed/unemployed', label: t('options.lifeStatus.employed', { ns: 'profile' }) },
    { value: 'child/pupil/student', label: t('options.lifeStatus.child', { ns: 'profile' }) },
    { value: 'pensioner', label: t('options.lifeStatus.pensioner', { ns: 'profile' }) }
  ];
  
  const genderOptions = [
    { value: 'male', label: t('options.gender.male', { ns: 'profile' }) },
    { value: 'female', label: t('options.gender.female', { ns: 'profile' }) }
  ];
  const [member, setMember] = useState<Omit<Member, 'member_id'>>({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: 'male',
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
    hat_size: 'L',
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
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailChecking, setEmailChecking] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'date_of_birth') {
      try {
        // Osiguravamo da je format datuma za input fields yyyy-mm-dd
        const formattedDate = formatInputDate(value);
        setMember(prev => ({ ...prev, [name]: formattedDate }));
      } catch {
        if (isDev) console.error("Invalid date format:", value);
        setMember(prev => ({ ...prev, [name]: value }));
      }
    } else {
      // Trim() za text polja (ime, prezime, email, adresa, grad, telefon)
      const trimmedValue = ['first_name', 'last_name', 'email', 'street_address', 'city', 'cell_phone'].includes(name)
        ? value.trim()
        : value;
      setMember(prev => ({ ...prev, [name]: trimmedValue }));
    }
  };

  const handleEmailBlur = async () => {
    if (!member.email) {
      setEmailError(null);
      return;
    }
    try {
      setEmailChecking(true);
      const res = await checkEmailAvailability(member.email);
      if (!res.available) {
        setEmailError(t('auth:emailAlreadyInUse'));
      } else {
        setEmailError(null);
      }
    } catch {
      // U slučaju greške API-ja, ne blokirati, samo logirati u DEV
      if (isDev) console.error('Email availability check failed');
      setEmailError(null);
    } finally {
      setEmailChecking(false);
    }
  };



  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Dodaj organization_id iz branding contexta
    const organizationId = branding?.id;
    if (!organizationId) {
      if (isDev) console.error('Cannot add member: organization_id is missing');
      return;
    }
    onAdd({ ...member, member_id: Date.now(), organization_id: organizationId } as Member);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">{t('addMemberForm.title')}</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="first_name"
            value={member.first_name}
            onChange={handleChange}
            placeholder={t('addMemberForm.firstName')}
            className="mt-2 p-2 w-full border rounded"
            required
          />
          <input
            type="text"
            name="last_name"
            value={member.last_name}
            onChange={handleChange}
            placeholder={t('addMemberForm.lastName')}
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
            placeholder={t('addMemberForm.streetAddress')}
            className="mt-2 p-2 w-full border rounded"
            required
          />
          <input
            type="text"
            name="city"
            value={member.city}
            onChange={handleChange}
            placeholder={t('addMemberForm.city')}
            className="mt-2 p-2 w-full border rounded"
            required
          />
          <input
            type="text"
            name="oib"
            value={member.oib}
            onChange={handleChange}
            placeholder={t('addMemberForm.oib')}
            pattern="[0-9]{11}"
            title={t('addMemberForm.oibTitle')}
            className="mt-2 p-2 w-full border rounded"
            required
          />
          <input
            type="tel"
            name="cell_phone"
            value={member.cell_phone}
            onChange={handleChange}
            placeholder={t('addMemberForm.cellPhone')}
            className="mt-2 p-2 w-full border rounded"
            required
          />
          <input
            type="email"
            name="email"
            value={member.email}
            onChange={handleChange}
            onBlur={() => { void handleEmailBlur(); }}
            placeholder={t('addMemberForm.email')}
            className="mt-2 p-2 w-full border rounded"
            required
          />
          {emailError && (
            <p className="text-sm text-red-500 mt-1">{emailError}</p>
          )}
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
          
          {/* Majica */}
          <label className="mt-4 block text-sm font-medium text-gray-700">
            {t('equipmentDelivery.tShirt', { ns: 'dashboards' })}
          </label>
          <select
            name="tshirt_size"
            value={member.tshirt_size}
            onChange={handleChange}
            className="mt-1 p-2 w-full border rounded bg-blue-50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
            required
          >
            {sizeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          {/* Vjetrena jakna */}
          <label className="mt-4 block text-sm font-medium text-gray-700">
            {t('equipmentDelivery.shellJacket', { ns: 'dashboards' })}
          </label>
          <select
            name="shell_jacket_size"
            value={member.shell_jacket_size}
            onChange={handleChange}
            className="mt-1 p-2 w-full border rounded bg-blue-50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
            required
          >
            {sizeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          {/* Kapa */}
          <label className="mt-4 block text-sm font-medium text-gray-700">
            {t('equipmentTypes.hat', { ns: 'dashboards' })}
          </label>
          <select
            name="hat_size"
            value={member.hat_size}
            onChange={handleChange}
            className="mt-1 p-2 w-full border rounded bg-blue-50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
            required
          >
            {hatSizeOptions.map(option => (
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
              <span>{t('skills.title', { ns: 'profile' })}</span>
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
                <p className="text-xs text-gray-500 mt-1">{t('skills.description', { ns: 'profile' })}</p>
              </div>
            )}
          </div>

          <div className="mt-4">
            <button 
              type="submit" 
              className="px-4 py-2 text-white rounded hover:opacity-90"
              style={{ backgroundColor: getPrimaryColor() }}
              disabled={Boolean(emailError) || emailChecking}
            >
              {t('addMemberForm.addButton')}
            </button>
            <button 
              type="button" 
              onClick={onClose} 
              className="ml-2 px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
            >
              {t('addMemberForm.cancelButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMemberForm;