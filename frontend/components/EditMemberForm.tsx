import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Member, MembershipTypeEnum } from '@shared/member';


interface EditMemberFormProps {
  member: Member;
  onClose: () => void;
  onEdit: (member: Member) => void;
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



type EditMemberLocal = Omit<Member, 'membership_type'> & { membership_type: 'regular' | 'honorary' | 'supporting' };

function parseMembershipType(value: unknown): 'regular' | 'honorary' | 'supporting' {
  return value === 'regular' || value === 'honorary' || value === 'supporting' ? value : 'regular';
}

const EditMemberForm: React.FC<EditMemberFormProps> = ({ member, onClose, onEdit }) => {
  const { t } = useTranslation();

  const lifeStatusOptions = [
    { value: 'employed/unemployed', label: t('memberProfile.personalInfo.employed') },
    { value: 'child/pupil/student', label: t('memberProfile.personalInfo.child') },
    { value: 'pensioner', label: t('memberProfile.personalInfo.pensioner') }
  ];

  const genderOptions = [
    { value: 'male', label: t('memberProfile.personalInfo.male') },
    { value: 'female', label: t('memberProfile.personalInfo.female') }
  ];
  const [editedMember, setEditedMember] = useState<EditMemberLocal>(() => ({
    ...member,
    tshirt_size: member.tshirt_size ?? 'XS',
    shell_jacket_size: member.shell_jacket_size ?? 'XS',
    life_status: member.life_status ?? 'employed/unemployed',
    gender: member.gender ?? 'male',
    membership_type: parseMembershipType(member.membership_type)
  }));

  useEffect(() => {
    setEditedMember({
      ...member,
      tshirt_size: member.tshirt_size ?? 'XS',
      shell_jacket_size: member.shell_jacket_size ?? 'XS',
      life_status: member.life_status ?? 'employed/unemployed',
      gender: member.gender ?? 'male',
      membership_type: parseMembershipType(member.membership_type)
    });
  }, [member]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditedMember(prev => {
      if (name === 'membership_type') {
        return { ...prev, membership_type: value as EditMemberLocal['membership_type'] };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
        // Prije slanja prema backendu, mapiraj membership_type string na MembershipTypeEnum
    let mappedMembershipType: MembershipTypeEnum = MembershipTypeEnum.Regular;
    switch (editedMember.membership_type) {
      case 'honorary':
        mappedMembershipType = MembershipTypeEnum.Honorary;
        break;
      case 'supporting':
        mappedMembershipType = MembershipTypeEnum.Supporting;
        break;
      case 'regular':
      default:
        mappedMembershipType = MembershipTypeEnum.Regular;
    }
    onEdit({ ...editedMember, membership_type: mappedMembershipType });
  };


  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">{t('editMemberForm.title')}</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="first_name"
            value={editedMember.first_name}
            onChange={handleChange}
            placeholder={t('editMemberForm.placeholders.firstName')}
            className="mt-2 p-2 w-full border rounded"
            required
          />
          <input
            type="text"
            name="last_name"
            value={editedMember.last_name}
            onChange={handleChange}
            placeholder={t('editMemberForm.placeholders.lastName')}
            className="mt-2 p-2 w-full border rounded"
            required
          />
          <input
            type="date"
            name="date_of_birth"
            value={editedMember.date_of_birth}
            onChange={handleChange}
            className="mt-2 p-2 w-full border rounded"
            required
          />
          {/* Add gender select field */}
          <select
            name="gender"
            value={editedMember.gender}
            onChange={handleChange}
            className="mt-2 p-2 w-full border rounded"
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
            value={editedMember.street_address}
            onChange={handleChange}
            placeholder={t('editMemberForm.placeholders.streetAddress')}
            className="mt-2 p-2 w-full border rounded"
            required
          />
          <input
            type="text"
            name="city"
            value={editedMember.city}
            onChange={handleChange}
            placeholder={t('editMemberForm.placeholders.city')}
            className="mt-2 p-2 w-full border rounded"
            required
          />
          <input
            type="text"
            name="oib"
            value={editedMember.oib}
            onChange={handleChange}
            placeholder={t('editMemberForm.placeholders.oib')}
            pattern="[0-9]{11}"
            title={t('editMemberForm.oibTitle')}
            className="mt-2 p-2 w-full border rounded"
            required
          />
          <input
            type="tel"
            name="cell_phone"
            value={editedMember.cell_phone}
            onChange={handleChange}
            placeholder={t('editMemberForm.placeholders.cellPhone')}
            className="mt-2 p-2 w-full border rounded"
            required
          />
          <input
            type="email"
            name="email"
            value={editedMember.email}
            onChange={handleChange}
            placeholder={t('editMemberForm.placeholders.email')}
            className="mt-2 p-2 w-full border rounded"
            required
          />
          <select
            name="life_status"
            value={editedMember.life_status}
            onChange={handleChange}
            className="mt-2 p-2 w-full border rounded"
            required
          >
            {lifeStatusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          {/* Keep this membership_type dropdown */}
          <select
            name="membership_type"
            value={editedMember.membership_type}
            onChange={handleChange}
            className="mt-2 p-2 w-full border rounded"
            required
          >
            <option value="regular">{t('membershipType.regular')}</option>
            <option value="supporting">{t('membershipType.supporting')}</option>
            <option value="honorary">{t('membershipType.honorary')}</option>
          </select>
          
          <select
            name="tshirt_size"
            value={editedMember.tshirt_size}
            onChange={handleChange}
            className="mt-2 p-2 w-full border rounded"
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
            value={editedMember.shell_jacket_size}
            onChange={handleChange}
            className="mt-2 p-2 w-full border rounded"
            required
          >
            {sizeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          <div className="mt-4">
            <button 
              type="submit" 
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {t('editMemberForm.buttons.update')}
            </button>
            <button 
              type="button" 
              onClick={onClose} 
              className="ml-2 px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
            >
              {t('editMemberForm.buttons.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMemberForm;