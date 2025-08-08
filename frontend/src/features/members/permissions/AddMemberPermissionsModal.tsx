// features/members/permissions/AddMemberPermissionsModal.tsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Search, UserPlus } from 'lucide-react';
import { getMembersWithoutPermissions } from '../../../features/systemManager/utils/systemManagerApi';
import { Member } from '@shared/member';

interface AddMemberPermissionsModalProps {
  onClose: () => void;
  onMemberSelect: (member: Member) => void;
}

const AddMemberPermissionsModal: React.FC<AddMemberPermissionsModalProps> = ({ 
  onClose,
  onMemberSelect
}) => {
  const { t } = useTranslation('members');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Dohvat članova bez ovlasti
  const fetchMembersWithoutPermissions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMembersWithoutPermissions();
      setMembers(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Došlo je do greške prilikom dohvata članova.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMembersWithoutPermissions();
  }, []);

  // Filtriranje članova prema pojmu za pretragu
  const filteredMembers = members.filter(member => {
    const fullName = `${member.first_name} ${member.last_name}`.toLowerCase();
    const term = searchTerm.toLowerCase();
    return fullName.includes(term) || (member.email?.toLowerCase()?.includes(term) ?? false);
  });

  // Odabir člana
  const handleMemberSelect = (member: Member) => {
    onMemberSelect(member);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-xl p-6 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{t('permissions.addMemberPermissions')}</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Pretraga */}
        <div className="relative mb-6">
          <input
            type="text"
            placeholder="Pretraži članove..."
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <Search className="h-4 w-4" />
          </div>
        </div>

        {/* Poruka o grešci */}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded">
            <p>{error}</p>
          </div>
        )}

        {/* Lista članova */}
        <div className="overflow-y-auto flex-grow">
          {loading ? (
            <div className="space-y-2">
              <div className="h-12 bg-gray-200 animate-pulse rounded"></div>
              <div className="h-12 bg-gray-200 animate-pulse rounded"></div>
              <div className="h-12 bg-gray-200 animate-pulse rounded"></div>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-8">
              <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              {searchTerm ? (
                <p className="text-gray-600">Nema članova koji odgovaraju pretrazi "{searchTerm}"</p>
              ) : (
                <p className="text-gray-600">Svi članovi već imaju administratorske ovlasti</p>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200">
              {filteredMembers.map((member) => (
                <div 
                  key={member.member_id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-200 last:border-b-0"
                  onClick={() => handleMemberSelect(member)}
                >
                  <div>
                    <div className="font-medium">
                      {member.first_name} {member.last_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {member.email}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {member.role === 'member_superuser' ? 'Superuser' : member.role === 'member_administrator' ? 'Admin' : 'Član'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddMemberPermissionsModal;
