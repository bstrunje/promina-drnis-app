// features/members/permisssions/MembersWithPermissions.tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User, RefreshCw } from 'lucide-react';
import useMembersWithPermissions from './hooks/useMembersWithPermissions';
import EditMemberPermissionsModal from './EditMemberPermissionsModal';
import { removeMemberPermissions } from './api/memberPermissionsApi';
import type { MemberRole } from '@shared/member';
import type { MemberWithPermissions } from '@shared/systemManager';
import { parseDate } from '../../../utils/dateUtils';

// Komponenta za prikaz i upravljanje članovima s administratorskim ovlastima
interface MembersWithPermissionsProps {
  activeTab: string;
}

interface EditableMember {
  member_id: number;
  full_name: string;
  email?: string;
  role?: MemberRole;
}

const MembersWithPermissions: React.FC<MembersWithPermissionsProps> = ({ activeTab }) => {
  const { t } = useTranslation('members');
  const { membersWithPermissions, loading, error, refreshMembersWithPermissions } = useMembersWithPermissions(activeTab);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // State za modalni prozor uređivanja ovlasti
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [selectedMember, setSelectedMember] = useState<EditableMember | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  // Filtriranje članova prema searchTerm
  const filteredMembers = membersWithPermissions.filter((memberWithPermissions: MemberWithPermissions) => {
    const fullName = memberWithPermissions.member.full_name.toLowerCase();
    const email = (memberWithPermissions.member.email ?? '').toLowerCase();
    const term = searchTerm.toLowerCase();
    
    return fullName.includes(term) || email.includes(term);
  });
  
  // Funkcija za otvaranje modalnog prozora za uređivanje ovlasti
  const handleEditClick = (memberWithPermissions: MemberWithPermissions) => {
    setSelectedMember({
      member_id: memberWithPermissions.member.member_id,
      full_name: memberWithPermissions.member.full_name,
      email: memberWithPermissions.member.email ?? undefined,
      role: memberWithPermissions.member.role as MemberRole | undefined,
    });
    setIsEditModalOpen(true);
  };
  
  // Funkcija za zatvaranje modalnog prozora za uređivanje
  const handleCloseModal = () => {
    setIsEditModalOpen(false);
    setSelectedMember(null);
  };

  // Funkcija za uklanjanje ovlasti člana
  const handleRemovePermissions = async (memberId: number) => {
    if (!window.confirm('Jeste li sigurni da želite ukloniti sve administratorske ovlasti ovom članu?')) {
      return;
    }
    
    try {
      await removeMemberPermissions(memberId);
      setDeleteError(null);
      setDeleteSuccess(t('permissions.permissionsRemovedSuccess'));
      // Osvježi popis članova nakon 1.5 sekundi
      setTimeout(() => {
        void refreshMembersWithPermissions();
        setDeleteSuccess(null);
      }, 1500);
    } catch (err) {
      if (err instanceof Error) {
        setDeleteError(err.message);
      } else {
        setDeleteError(t('permissions.removePermissionsError'));
      }
      // Automatski ukloni poruku o grešci nakon 3 sekunde
      setTimeout(() => setDeleteError(null), 3000);
    }
  };
  
  // Funkcija koja se poziva nakon što se ovlasti uspješno spreme
  const handleSaveSuccess = () => {
    void refreshMembersWithPermissions();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">{t('permissions.managePermissions')}</h2>
        
        <button 
          onClick={() => { void refreshMembersWithPermissions(); }} 
          disabled={loading}
          className="flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          {loading ? t('common.refreshing') : t('common.refreshData')}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-md mb-6">
          {error}
        </div>
      )}
      
      {deleteError && (
        <div className="bg-red-100 text-red-700 p-4 rounded-md mb-6">
          {deleteError}
        </div>
      )}
      
      {deleteSuccess && (
        <div className="bg-green-100 text-green-700 p-4 rounded-md mb-6">
          {deleteSuccess}
        </div>
      )}

      {/* Pretraga i akcije */}
      <div className="flex justify-between items-center mb-6">
        <div className="relative w-full max-w-md">
          <input
            type="text"
            placeholder={t('permissions.searchMembers')}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
        </div>
      </div>

      {/* Tablica s članovima */}
      {loading ? (
        <div className="space-y-4">
          <div className="h-12 bg-gray-200 animate-pulse rounded-md"></div>
          <div className="h-12 bg-gray-200 animate-pulse rounded-md"></div>
          <div className="h-12 bg-gray-200 animate-pulse rounded-md"></div>
        </div>
      ) : membersWithPermissions.length === 0 ? (
        <div className="bg-gray-50 p-8 text-center rounded-md">
          <User className="h-10 w-10 text-gray-400 mx-auto mb-4" />
          <h3 className="text-gray-700 font-medium mb-2">{t('permissions.noMembersWithPermissions')}</h3>
          <p className="text-gray-500">
            {t('permissions.noMembersWithPermissionsDescription')}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-md shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('permissions.member')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('permissions.permissions')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('permissions.granted')}
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMembers.map((memberWithPermissions) => (
                <tr key={memberWithPermissions.member.member_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-blue-100 rounded-full text-blue-600">
                        {memberWithPermissions.member.first_name.charAt(0)}
                        {memberWithPermissions.member.last_name.charAt(0)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {memberWithPermissions.member.full_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {memberWithPermissions.member.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {memberWithPermissions.can_view_members && 
                        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                          {t('permissions.viewMembers')}
                        </span>
                      }
                      {memberWithPermissions.can_edit_members && 
                        <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                          {t('permissions.editMembers')}
                        </span>
                      }
                      {/* Prikazujemo samo neke ovlasti, ostatak se može vidjeti u detaljnom pregledu */}
                      {(memberWithPermissions.can_manage_membership || 
                        memberWithPermissions.can_view_financials || 
                        memberWithPermissions.can_manage_financials) && 
                        <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                          +{Object.values(memberWithPermissions).filter(value => value === true).length - 2} {t('permissions.more')}
                        </span>
                      }
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {memberWithPermissions.granted_at ? 
                      (parseDate(memberWithPermissions.granted_at) ? 
                        parseDate(memberWithPermissions.granted_at)!.toLocaleDateString('hr-HR') : '-') 
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      className="text-blue-600 hover:text-blue-900 mr-4"
                      onClick={() => handleEditClick(memberWithPermissions)}
                    >
                      {t('common.edit')}
                    </button>
                    <button 
                      className="text-red-600 hover:text-red-900"
                      onClick={() => void handleRemovePermissions(memberWithPermissions.member.member_id)}
                    >
                      {t('permissions.remove')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Modalni prozor za uređivanje ovlasti */}
      {isEditModalOpen && selectedMember && (
        <EditMemberPermissionsModal
          member={selectedMember}
          onClose={handleCloseModal}
          onSave={handleSaveSuccess}
        />
      )}
    </div>
  );
};

export default MembersWithPermissions;
