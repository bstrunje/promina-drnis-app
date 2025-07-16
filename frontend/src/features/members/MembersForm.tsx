import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Member, MembershipTypeEnum } from '@shared/member';
import SkillsSelector, { SelectedSkill } from '../../../components/SkillsSelector';
import { Save, X, ChevronDown, ChevronUp } from 'lucide-react';

// Helper za backward kompatibilnost - premješten nakon importa
/**
 * Mapira različite formate tipa članstva u standardni MembershipTypeEnum
 * @param value Vrijednost koju treba mapirati u enum
 * @returns Odgovarajući MembershipTypeEnum
 */
// Ovdje nije smisleno koristiti ?? jer želimo provjeriti oba slučaja (string ili enum vrijednost)
// Uspoređujemo samo string literal vrijednosti zbog sigurnosti i lintera
function mapMembershipTypeToEnum(value: string | MembershipTypeEnum): MembershipTypeEnum {
  if (value === 'regular' || value === 'Regular') return MembershipTypeEnum.Regular;
  if (value === 'supporting' || value === 'Supporting') return MembershipTypeEnum.Supporting;
  if (value === 'honorary' || value === 'Honorary') return MembershipTypeEnum.Honorary;
  return MembershipTypeEnum.Regular; // fallback
}

interface MemberFormProps {
  member?: Member;
  onSubmit: (member: Member) => void;
  onCancel: () => void;
}

interface MemberFormData {
  member_id?: number;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  street_address: string;
  city: string;
  oib: string;
  cell_phone: string;
  email: string;
  life_status: 'employed/unemployed' | 'child/pupil/student' | 'pensioner';
  tshirt_size: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL';
  shell_jacket_size: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL';
  membership_type: MembershipTypeEnum;
  registration_completed: boolean;
  total_hours: number;
  role: 'member' | 'member_administrator' | 'member_superuser';
  gender: 'male' | 'female';
  skills: SelectedSkill[];
  other_skills: string;
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



export default function MemberForm({ member, onSubmit, onCancel }: MemberFormProps) {
  const { t } = useTranslation();
  const [showSkills, setShowSkills] = useState(false);

  const lifeStatusOptions = [
    { value: 'employed/unemployed', label: t('memberProfile.personalInfo.employed') },
    { value: 'child/pupil/student', label: t('memberProfile.personalInfo.child') },
    { value: 'pensioner', label: t('memberProfile.personalInfo.pensioner') }
  ];
  const [formData, setFormData] = useState<MemberFormData>({
    member_id: member?.member_id ?? 0,
    first_name: member?.first_name ?? '',
    last_name: member?.last_name ?? '',
    date_of_birth: member?.date_of_birth ?? '',
    street_address: member?.street_address ?? '',
    city: member?.city ?? '',
    oib: member?.oib ?? '',
    cell_phone: member?.cell_phone ?? '',
    email: member?.email ?? '',
    life_status: member?.life_status ?? 'employed/unemployed',
    tshirt_size: member?.tshirt_size ?? 'M',
    shell_jacket_size: member?.shell_jacket_size ?? 'M',
    // Uvijek uspoređuj s string literalima zbog lintera
// Zbog lintera i sigurnosti koristi se mapMembershipTypeToEnum util
membership_type: mapMembershipTypeToEnum(
  typeof member?.membership_type === 'string'
    ? member.membership_type
    : member?.membership_type ?? 'regular'
),
    registration_completed: member?.registration_completed ?? false,
    role: member?.role ?? 'member',
    total_hours: member?.total_hours ?? 0,
    gender: member?.gender ?? 'male',
    skills: member?.skills ?? [],
    other_skills: member?.other_skills ?? ''
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Combine existing member data with form data
    const updatedMember = {
      ...(member ?? {}),
      ...formData,
    } as Member;
    onSubmit(updatedMember);
  };

  // Uklonjeno jer nije korišteno


  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-1">{t('membersForm.registrationStatus')}</label>
            <select
              name="registration_completed"
              value={formData.registration_completed.toString()}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                registration_completed: e.target.value === 'true'
              }))}
              className="mt-2 p-2 w-full border rounded bg-blue-50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
            >
              <option value="false">{t('membersForm.pending')}</option>
              <option value="true">{t('membersForm.completed')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('memberProfile.personalInfo.firstName')}
            </label>
            <input
              type="text"
              required
              className="mt-2 p-2 w-full border rounded"
              value={formData.first_name}
              onChange={(e) => setFormData({...formData, first_name: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('memberProfile.personalInfo.PrezimelastName')}
            </label>
            <input
              type="text"
              required
              className="mt-2 p-2 w-full border rounded"
              value={formData.last_name}
              onChange={(e) => setFormData({...formData, last_name: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('memberProfile.personalInfo.dateOfBirth')}
            </label>
            <input
              type="date"
              required
              className="mt-2 p-2 w-full border rounded bg-gray-50"
              value={formData.date_of_birth}
              onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('memberProfile.personalInfo.address')}
            </label>
            <input
              type="text"
              required
              className="mt-2 p-2 w-full border rounded"
              value={formData.street_address}
              onChange={(e) => setFormData({...formData, street_address: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('memberProfile.personalInfo.city')}
            </label>
            <input
              type="text"
              required
              className="mt-2 p-2 w-full border rounded"
              value={formData.city}
              onChange={(e) => setFormData({...formData, city: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('memberProfile.personalInfo.oib')}
            </label>
            <input
              type="text"
              required
              pattern="[0-9]{11}"
              title={t('editMemberForm.oibTitle')}
              className="mt-2 p-2 w-full border rounded"
              value={formData.oib}
              onChange={(e) => setFormData({...formData, oib: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('memberProfile.personalInfo.phone')}
            </label>
            <input
              type="tel"
              required
              className="mt-2 p-2 w-full border rounded"
              value={formData.cell_phone}
              onChange={(e) => setFormData({...formData, cell_phone: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('memberProfile.personalInfo.email')}
            </label>
            <input
              type="email"
              required
              className="mt-2 p-2 w-full border rounded"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('memberProfile.personalInfo.gender')}
            </label>
            <select
              required
              value={formData.gender}
              onChange={(e) => setFormData({...formData, gender: e.target.value as 'male' | 'female'})}
              className="mt-2 p-2 w-full border rounded bg-blue-50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
            >
              <option value="male">{t('memberProfile.personalInfo.male')}</option>
              <option value="female">{t('memberProfile.personalInfo.female')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('memberProfile.personalInfo.lifeStatus')}
            </label>
            <select
              required
              className="mt-2 p-2 w-full border rounded bg-blue-50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
              value={formData.life_status}
              onChange={(e) => setFormData({...formData, life_status: e.target.value as 'employed/unemployed' | 'child/pupil/student' | 'pensioner'})}
            >
              {lifeStatusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('memberProfile.personalInfo.tShirtSize')}
            </label>
            <select
              required
              className="mt-2 p-2 w-full border rounded bg-blue-50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
              value={formData.tshirt_size}
              onChange={(e) => setFormData({...formData, tshirt_size: e.target.value as 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL'})}
            >
              {sizeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('memberProfile.personalInfo.shellJacketSize')}
            </label>
            <select
              required
              className="mt-2 p-2 w-full border rounded bg-blue-50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
              value={formData.shell_jacket_size}
              onChange={(e) => setFormData({...formData, shell_jacket_size: e.target.value as 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL'})}
            >
              {sizeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('memberProfile.membershipDetails.role')}
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={(e) => {
                const value = e.target.value;
                setFormData(prev => ({
                  ...prev,
                  role: value === 'member' || value === 'member_administrator' || value === 'member_superuser'
                    ? value
                    : 'member',
                }));
              }}
              className="mt-2 p-2 w-full border rounded bg-blue-50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
            >
              <option value="member">{t('roles.member')}</option>
              <option value="member_administrator">{t('roles.member_administrator')}</option>
              <option value="member_superuser">{t('roles.member_superuser')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('memberProfile.membershipDetails.membershipType')}
            </label>
            <select
              name="membership_type"
              value={formData.membership_type}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                membership_type: mapMembershipTypeToEnum(e.target.value)
              }))}
              className="mt-2 p-2 w-full border rounded bg-blue-50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
            >
              <option value={MembershipTypeEnum.Regular}>{t('membershipType.regular')}</option>
              <option value={MembershipTypeEnum.Supporting}>{t('membershipType.supporting')}</option>
              <option value={MembershipTypeEnum.Honorary}>{t('membershipType.honorary')}</option>
            </select>
          </div>
        </div>

        {/* Sekcija za odabir vještina */}
        <div className="col-span-1 md:col-span-2">
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
                        value={formData.skills}
                        otherSkills={formData.other_skills}
                        onChange={(selected, other) => {
                          setFormData(prev => ({ ...prev, skills: selected, other_skills: other }));
                        }}
                    />
                </div>
            )}
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <X className="mr-2 h-4 w-4" />
            {t('editMemberForm.buttons.cancel')}
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Save className="mr-2 h-4 w-4" />
            {t('editMemberForm.buttons.save')}
          </button>
        </div>
  </form>
</div>
  );
}