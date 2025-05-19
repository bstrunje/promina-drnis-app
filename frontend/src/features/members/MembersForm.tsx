import { useState } from 'react';
import { Member, MembershipTypeEnum } from '@shared/member';
import { Save, X } from 'lucide-react';

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
  role: 'member' | 'admin' | 'superuser';
  gender: 'male' | 'female';
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

export default function MemberForm({ member, onSubmit, onCancel }: MemberFormProps) {
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
    gender: member?.gender ?? 'male'
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
            <label className="block text-sm font-medium mb-1">Registration Status</label>
            <select
              name="registration_completed"
              value={formData.registration_completed.toString()}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                registration_completed: e.target.value === 'true'
              }))}
              className="mt-2 p-2 w-full border rounded bg-blue-50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
            >
              <option value="false">Pending</option>
              <option value="true">Completed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Name
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
              Last Name
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
              Date of Birth
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
              Street Address
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
              City
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
              OIB
            </label>
            <input
              type="text"
              required
              pattern="[0-9]{11}"
              title="OIB must be exactly 11 digits"
              className="mt-2 p-2 w-full border rounded"
              value={formData.oib}
              onChange={(e) => setFormData({...formData, oib: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Cell Phone
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
              Email
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
              Gender
            </label>
            <select
              required
              value={formData.gender}
              onChange={(e) => setFormData({...formData, gender: e.target.value as 'male' | 'female'})}
              className="mt-2 p-2 w-full border rounded bg-blue-50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Life Status
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
              T-shirt Size
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
              Shell Jacket Size
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
              Role
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={(e) => {
                // TypeScript zahtijeva da role bude točno 'member' | 'admin' | 'superuser', nikad undefined
                const value = e.target.value;
                setFormData(prev => ({
                  ...prev,
                  role: value === 'member' || value === 'admin' || value === 'superuser'
                    ? value
                    : 'member', // fallback na 'member' ako iz nekog razloga value nije očekivan
                }));
              }}
              className="mt-2 p-2 w-full border rounded bg-blue-50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="superuser">Superuser</option>
            </select>
          </div>

        </div> 

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Membership Type
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
            <option value={MembershipTypeEnum.Regular}>Regular Member</option>
            <option value={MembershipTypeEnum.Supporting}>Supporting Member</option>
            <option value={MembershipTypeEnum.Honorary}>Honorary Member</option>
          </select>
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </form>
    </div>
  );

}