// features/members/permissions/components/MemberRoleSelector.tsx
import React, { useState, useEffect } from 'react';
import { MemberRole } from '@shared/member';
import { updateMemberRole } from '../api/memberPermissionsApi';

interface MemberRoleSelectorProps {
  memberId: number;
  currentRole?: MemberRole;
  onRoleChange?: (newRole: MemberRole) => void;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const MemberRoleSelector: React.FC<MemberRoleSelectorProps> = ({
  memberId,
  currentRole = 'member',
  onRoleChange,
  onSuccess,
  onError
}) => {
  // Osiguravamo da selectedRole uvijek ima definiranu vrijednost
  // Koristimo useMemo kako bi se inicijalna vrijednost postavila samo jednom
  const initialRole = React.useMemo<MemberRole>(() => currentRole || 'member', []);
  const [selectedRole, setSelectedRole] = useState<MemberRole>(initialRole);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    setSelectedRole(currentRole);
  }, [currentRole]);

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as MemberRole;
    setSelectedRole(newRole);
    if (onRoleChange) {
      onRoleChange(newRole);
    }
  };

  const handleSaveRole = async () => {
    if (selectedRole === currentRole) {
      return; // Nema promjene
    }

    try {
      setSaving(true);
      await updateMemberRole(memberId, selectedRole);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Greška prilikom promjene role:', err);
      if (onError) {
        onError(err instanceof Error ? err.message : 'Došlo je do greške prilikom promjene role člana.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
      <h3 className="text-md font-semibold mb-3">Rola člana</h3>
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-grow">
          <select
            value={selectedRole}
            onChange={handleRoleChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            disabled={saving}
          >
            <option value="member">Član</option>
            <option value="member_administrator">Administrator</option>
            <option value="member_superuser">Superuser</option>
          </select>
        </div>
        <div>
          <button
            onClick={handleSaveRole}
            disabled={saving || selectedRole === currentRole}
            className={`px-4 py-2 rounded-md ${
              saving || selectedRole === currentRole
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {saving ? 'Spremanje...' : 'Promijeni rolu'}
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-600 mt-2">
        <strong>Član:</strong> Standardna korisnička rola bez administratorskih ovlasti.<br />
        <strong>Administrator:</strong> Može upravljati članovima i drugim funkcionalnostima ovisno o dodijeljenim ovlastima.<br />
        <strong>Superuser:</strong> Ima pristup svim funkcionalnostima sustava, uključujući dodjelu rola i ovlasti.
      </p>
    </div>
  );
};

export default MemberRoleSelector;
