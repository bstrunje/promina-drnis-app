// features/systemAdmin/components/members/MembersWithPermissions.tsx
import React, { useState } from 'react';
import { User, UserPlus, RefreshCw } from 'lucide-react';
import useMembersWithPermissions from '../../hooks/useMembersWithPermissions';

// Komponenta za prikaz i upravljanje članovima s administratorskim ovlastima
interface MembersWithPermissionsProps {
  activeTab: string;
}

const MembersWithPermissions: React.FC<MembersWithPermissionsProps> = ({ activeTab }) => {
  const { membersWithPermissions, loading, error, refreshMembersWithPermissions } = useMembersWithPermissions(activeTab);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Filtriranje članova prema searchTerm
  const filteredMembers = membersWithPermissions.filter(memberWithPermissions => {
    const fullName = memberWithPermissions.member.full_name.toLowerCase();
    const email = (memberWithPermissions.member.email ?? '').toLowerCase();
    const term = searchTerm.toLowerCase();
    
    return fullName.includes(term) || email.includes(term);
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Upravljanje ovlastima članova</h2>
        
        <button 
          onClick={() => { void refreshMembersWithPermissions(); }} 
          disabled={loading}
          className="flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Osvježavanje...' : 'Osvježi podatke'}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* Pretraga i akcije */}
      <div className="flex justify-between items-center mb-6">
        <div className="relative w-72">
          <input
            type="text"
            placeholder="Pretraži članove..."
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
        
        <button className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
          <UserPlus className="h-4 w-4 mr-2" />
          <span>Dodaj ovlasti članu</span>
        </button>
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
          <h3 className="text-gray-700 font-medium mb-2">Nema članova s ovlastima</h3>
          <p className="text-gray-500">
            Trenutno nema članova kojima su dodijeljene administratorske ovlasti.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-md shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Član
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ovlasti
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dodijeljeno
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Akcije
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
                          Pregled članova
                        </span>
                      }
                      {memberWithPermissions.can_edit_members && 
                        <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                          Uređivanje članova
                        </span>
                      }
                      {/* Prikazujemo samo neke ovlasti, ostatak se može vidjeti u detaljnom pregledu */}
                      {(memberWithPermissions.can_manage_membership || 
                        memberWithPermissions.can_view_financials || 
                        memberWithPermissions.can_manage_financials) && 
                        <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                          +{Object.values(memberWithPermissions).filter(value => value === true).length - 2} više
                        </span>
                      }
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(memberWithPermissions.granted_at).toLocaleDateString('hr-HR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-4">Uredi</button>
                    <button className="text-red-600 hover:text-red-900">Ukloni</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MembersWithPermissions;
