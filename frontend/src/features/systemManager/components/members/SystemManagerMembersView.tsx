import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Member } from '@shared/member';
import { getAllMembersForSystemManager, deleteMemberForSystemManager } from '../../utils/systemManagerApi';
import { Button } from '@components/ui/button';
import { Trash2, Filter, ArrowLeft } from 'lucide-react';
import { useSystemManager } from '../../../../../src/context/SystemManagerContext';

// Jednostavan prikaz članova za System Manager, bez korištenja postojećeg MemberTable (Option B)
// Namjena: upravljanje članovima (brisanje) unutar System Manager dashboarda bez otvaranja nove kartice
interface SystemManagerMembersViewProps {
  setActiveTab: (tab: 'dashboard' | 'members' | 'settings' | 'register-members' | 'audit-logs' | 'organizations') => void;
  activeTab: 'dashboard' | 'members' | 'settings' | 'register-members' | 'audit-logs' | 'organizations';
}

const SystemManagerMembersView: React.FC<SystemManagerMembersViewProps> = ({ setActiveTab, activeTab }) => {
  const { manager } = useSystemManager();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrganization, setSelectedOrganization] = useState<string>('all');
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  
  // Check if current user is Global System Manager (organization_id === null)
  const isGlobalManager = manager?.organization_id === null;

  // Dohvat članova s pagination
  const fetchMembers = useCallback(async (page = 1, reset = false) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllMembersForSystemManager(page, pagination.limit);
      
      if (reset) {
        setMembers(data.members);
        setPagination(data.pagination);
      } else {
        setMembers(prev => [...prev, ...data.members]);
        setPagination(data.pagination);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Greška prilikom dohvata članova.');
    } finally {
      setLoading(false);
    }
  }, [pagination.limit]);
  
  // Reset pagination when filter changes
  const handleFilterChange = useCallback(() => {
    setMembers([]);
    void fetchMembers(1, true);
  }, [fetchMembers]);
  
  // Load more pages
  const loadMore = () => {
    if (pagination.hasNext && !loading) {
      void fetchMembers(pagination.page + 1, false);
    }
  };

  // Dohvat članova samo kad je komponenta aktivna
  useEffect(() => {
    const isActive = activeTab === 'members';
    if (isActive && members.length === 0) {
      handleFilterChange();
    }
  }, [activeTab, handleFilterChange, members.length]);
  
  // Reset kad se mijenja filter
  useEffect(() => {
    if (members.length > 0) {
      handleFilterChange();
    }
  }, [selectedOrganization, handleFilterChange, members.length]);

  // Get unique organizations for filter dropdown
  const uniqueOrganizations = useMemo(() => {
    const orgs = members
      .filter(m => m.organization)
      .map(m => ({
        id: m.organization!.id,
        name: m.organization!.name,
        short_name: m.organization!.short_name
      }))
      .filter((org, index, self) => 
        index === self.findIndex(o => o.id === org.id)
      );
    return orgs.sort((a, b) => a.short_name.localeCompare(b.short_name));
  }, [members]);

  // Filter members by selected organization (client-side filtering for pagination)
  const filteredMembers = useMemo(() => {
    if (selectedOrganization === 'all') {
      return members;
    }
    if (selectedOrganization === 'no-org') {
      return members.filter(m => !m.organization);
    }
    return members.filter(m => 
      m.organization && m.organization.id.toString() === selectedOrganization
    );
  }, [members, selectedOrganization]);
  
  // Recalculate filtered pagination info
  const filteredPagination = useMemo(() => {
    if (selectedOrganization === 'all') {
      return pagination;
    }
    // For filtered results, we show actual count but pagination info from backend
    return {
      ...pagination,
      total: filteredMembers.length
    };
  }, [pagination, filteredMembers, selectedOrganization]);

  // Brisanje člana uz potvrdu
  const handleDelete = async (member: Member) => {
    const fullName = member.full_name ?? `${member.first_name} ${member.last_name}`;
    const confirmed = window.confirm(`Jeste li sigurni da želite trajno obrisati člana: \n${fullName} (ID: ${member.member_id})?`);
    if (!confirmed) return;

    try {
      setLoading(true);
      await deleteMemberForSystemManager(Number(member.member_id));
      // Nakon uspješnog brisanja osvježi listu
      await fetchMembers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Greška prilikom brisanja člana');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-md shadow">
      {/* Back button i filtri */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Overview
        </Button>
        <div className="flex items-center gap-4">
          {/* Organization filter - only for Global System Manager */}
          {isGlobalManager && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={selectedOrganization}
                onChange={(e) => setSelectedOrganization(e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="all">All Organizations</option>
                <option value="no-org">No Organization</option>
                {uniqueOrganizations.map(org => (
                  <option key={org.id} value={org.id.toString()}>
                    {org.short_name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="text-sm text-gray-500">
            Showing: {filteredMembers.length} {filteredPagination.total > 0 ? `/ ${filteredPagination.total}` : ''}
          </div>
        </div>
      </div>

      {/* Stanje učitavanja/greške */}
      {loading && <div className="py-8 text-center text-gray-600">Učitavanje...</div>}
      {error && !loading && (
        <div className="mb-3 p-3 bg-red-50 text-red-700 border border-red-200 rounded">{error}</div>
      )}

      {/* Tablica članova */}
      {!loading && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] table-auto border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="px-3 py-2 border-b">ID</th>
                <th className="px-3 py-2 border-b">Member</th>
                <th className="px-3 py-2 border-b">Email</th>
                <th className="px-3 py-2 border-b">Organization</th>
                <th className="px-3 py-2 border-b">Status</th>
                <th className="px-3 py-2 border-b w-24 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((m) => (
                <tr 
                  key={m.member_id} 
                  className={`hover:bg-gray-50 border-b ${
                    m.status === 'pending' ? 'bg-yellow-50' : ''
                  }`}
                >
                  <td className="px-3 py-2 align-middle">{m.member_id}</td>
                  <td className="px-3 py-2 align-middle">
                    <div className="font-medium text-gray-900">
                      {m.full_name ?? `${m.first_name} ${m.last_name}${m.nickname ? ` - ${m.nickname}` : ''}`}
                    </div>
                  </td>
                  <td className="px-3 py-2 align-middle">{m.email}</td>
                  <td className="px-3 py-2 align-middle">
                    {m.organization ? (
                      <span className="text-sm">
                        <span className="font-medium">{m.organization.short_name}</span>
                        <br />
                        <span className="text-gray-500 text-xs">{m.organization.name}</span>
                      </span>
                    ) : (
                      <span className="text-gray-400 italic text-sm">No Organization</span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      m.status === 'pending' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : m.status === 'registered'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {m.status === 'pending' ? 'PENDING' : 
                       m.status === 'registered' ? 'REGISTERED' : 
                       m.status?.toUpperCase() ?? 'UNKNOWN'}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-middle text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Delete Member"
                      onClick={() => { void handleDelete(m); }}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredMembers.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray-600">
                    {selectedOrganization === 'all' 
                      ? 'No members to display' 
                      : 'No members found for selected organization'}
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-gray-600">
                    Loading more members...
                  </td>
                </tr>
              )}
              {!loading && pagination.hasNext && filteredMembers.length > 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadMore}
                      disabled={loading}
                      className="min-w-[120px]"
                    >
                      Load More ({pagination.total - filteredMembers.length} remaining)
                    </Button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SystemManagerMembersView;
