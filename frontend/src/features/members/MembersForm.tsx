import { useState } from 'react';
import { Member, MembershipType } from '@shared/member';
import { Save, X } from 'lucide-react';

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
  membership_type: MembershipType;
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
    member_id: member?.member_id || 0,
    first_name: member?.first_name || '',
    last_name: member?.last_name || '',
    date_of_birth: member?.date_of_birth || '',
    street_address: member?.street_address || '',
    city: member?.city || '',
    oib: member?.oib || '',
    cell_phone: member?.cell_phone || '',
    email: member?.email || '',
    life_status: member?.life_status || 'employed/unemployed',
    tshirt_size: member?.tshirt_size || 'M',
    shell_jacket_size: member?.shell_jacket_size || 'M',
    membership_type: member?.membership_type || 'regular',
    registration_completed: member?.registration_completed || false,
    role: member?.role || 'member',
    total_hours: member?.total_hours || 0,
    gender: member?.gender || 'male'
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Combine existing member data with form data
    const updatedMember = {
      ...(member || {}),
      ...formData,
    } as Member;
    onSubmit(updatedMember);
  };

  const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' }
];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <select
    name="gender"
    value={member?.gender}
    onChange={handleChange}
    className="mt-2 p-2 w-full border rounded"
    required
>
    <option value="">Select Gender</option>
    {genderOptions.map(option => (
        <option key={option.value} value={option.value}>
            {option.label}
        </option>
    ))}
</select>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Life Status
            </label>
            <select
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
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
              onChange={(e) => setFormData(prev => ({
                ...prev,
                role: e.target.value as Member['role']
              }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
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
                membership_type: e.target.value as MembershipType
              }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
            >
              <option value="regular">Regular Member</option>
              <option value="supporting">Supporting Member</option>
              <option value="honorary">Honorary Member</option>
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