// features/systemAdmin/SystemAdminDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSystemAdmin } from '../../context/SystemAdminContext';
import { getMembersWithPermissions, getSystemAdminDashboardStats } from './systemAdminApi';
import { MemberWithPermissions } from '@shared/systemAdmin';
import { Shield, Users, User, LogOut, Settings, Activity, RefreshCw, ChevronRight, Database, Server, FileText } from 'lucide-react';
import { SystemAdminDashboardStats } from './systemAdminApi';
import { formatDate } from "../../utils/dateUtils"; // Import formatDate funkciju

const SystemAdminDashboard: React.FC = () => {
  const { admin, logout } = useSystemAdmin();
  const navigate = useNavigate();
  const [membersWithPermissions, setMembersWithPermissions] = useState<MemberWithPermissions[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'members' | 'settings'>('dashboard');
  const [stats, setStats] = useState<SystemAdminDashboardStats>({
    totalMembers: 0,
    registeredMembers: 0,
    activeMembers: 0,
    pendingApprovals: 0,
    recentActivities: 0,
    systemHealth: 'Nepoznato',
    lastBackup: 'Nikad',
  });

  useEffect(() => {
    const fetchMembersWithPermissions = async () => {
      try {
        setLoading(true);
        const data = await getMembersWithPermissions();
        setMembersWithPermissions(data);
        setError(null);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Došlo je do greške prilikom dohvata članova s ovlastima.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMembersWithPermissions();
  }, []);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setStatsLoading(true);
        const data = await getSystemAdminDashboardStats();
        setStats(data);
        setStatsError(null);
      } catch (err) {
        if (err instanceof Error) {
          setStatsError(err.message);
        } else {
          setStatsError('Došlo je do greške prilikom dohvata statistika dashboarda.');
        }
      } finally {
        setStatsLoading(false);
      }
    };

    if (activeTab === 'dashboard') {
      fetchDashboardStats();
    }
  }, [activeTab]);

  // Funkcija za osvježavanje statistika
  const refreshDashboardStats = async () => {
    try {
      setStatsLoading(true);
      const data = await getSystemAdminDashboardStats();
      setStats(data);
      setStatsError(null);
    } catch (err) {
      if (err instanceof Error) {
        setStatsError(err.message);
      } else {
        setStatsError('Došlo je do greške prilikom dohvata statistika dashboarda.');
      }
    } finally {
      setStatsLoading(false);
    }
  };

  // Funkcija za kategorizaciju ovlasti
  const categorizePermissions = (member: MemberWithPermissions) => {
    const categories = [
      {
        name: 'Članstvo',
        permissions: [
          { key: 'can_view_members', label: 'Pregled članova', value: member.can_view_members },
          { key: 'can_edit_members', label: 'Uređivanje članova', value: member.can_edit_members },
          { key: 'can_add_members', label: 'Dodavanje članova', value: member.can_add_members },
          { key: 'can_manage_membership', label: 'Upravljanje članstvom', value: member.can_manage_membership },
        ]
      },
      {
        name: 'Aktivnosti',
        permissions: [
          { key: 'can_view_activities', label: 'Pregled aktivnosti', value: member.can_view_activities },
          { key: 'can_create_activities', label: 'Kreiranje aktivnosti', value: member.can_create_activities },
          { key: 'can_approve_activities', label: 'Odobravanje aktivnosti', value: member.can_approve_activities },
        ]
      },
      {
        name: 'Financije',
        permissions: [
          { key: 'can_view_financials', label: 'Pregled financija', value: member.can_view_financials },
          { key: 'can_manage_financials', label: 'Upravljanje financijama', value: member.can_manage_financials },
        ]
      },
      {
        name: 'Poruke',
        permissions: [
          { key: 'can_send_group_messages', label: 'Slanje grupnih poruka', value: member.can_send_group_messages },
          { key: 'can_manage_all_messages', label: 'Upravljanje svim porukama', value: member.can_manage_all_messages },
        ]
      },
      {
        name: 'Ostalo',
        permissions: [
          { key: 'can_view_statistics', label: 'Pregled statistika', value: member.can_view_statistics },
          { key: 'can_export_data', label: 'Izvoz podataka', value: member.can_export_data },
          { key: 'can_manage_end_reasons', label: 'Upravljanje razlozima prestanka', value: member.can_manage_end_reasons },
          { key: 'can_manage_card_numbers', label: 'Upravljanje brojevima iskaznica', value: member.can_manage_card_numbers },
          { key: 'can_assign_passwords', label: 'Dodjela lozinki', value: member.can_assign_passwords },
        ]
      }
    ];

    return categories;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-800">System Admin Panel</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              Prijavljeni kao: <span className="font-medium">{admin?.display_name}</span>
            </div>
            <button
              onClick={logout}
              className="flex items-center text-red-600 hover:text-red-800"
            >
              <LogOut className="h-4 w-4 mr-1" />
              <span>Odjava</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4">
        {/* Navigation Tabs */}
        <div className="flex border-b mb-4">
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'dashboard'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-blue-600'
            }`}
            onClick={() => setActiveTab('dashboard')}
          >
            <div className="flex items-center">
              <Activity className="h-4 w-4 mr-2" />
              <span>Pregled sustava</span>
            </div>
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'members'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-blue-600'
            }`}
            onClick={() => setActiveTab('members')}
          >
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-2" />
              <span>Upravljanje ovlastima članova</span>
            </div>
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'settings'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-blue-600'
            }`}
            onClick={() => setActiveTab('settings')}
          >
            <div className="flex items-center">
              <Settings className="h-4 w-4 mr-2" />
              <span>Postavke sustava</span>
            </div>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Pregled sustava</h2>
              
              <button 
                onClick={refreshDashboardStats} 
                disabled={statsLoading}
                className="flex items-center text-sm text-blue-600 hover:text-blue-800"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${statsLoading ? 'animate-spin' : ''}`} />
                {statsLoading ? 'Osvježavanje...' : 'Osvježi podatke'}
              </button>
            </div>

            {statsError && (
              <div className="bg-red-100 text-red-700 p-4 rounded-md mb-6">
                {statsError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {/* Kartica članova */}
              <div
                onClick={() => navigate("/members")}
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-600 font-medium">Članovi</h3>
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="space-y-2">
                  {statsLoading ? (
                    <div className="h-8 bg-gray-200 animate-pulse rounded-md"></div>
                  ) : (
                    <>
                      <p className="text-2xl font-bold">{stats.totalMembers}</p>
                      <p className="text-sm text-gray-500">
                        {stats.registeredMembers} registriranih, {stats.activeMembers} aktivnih 
                        {stats.registeredMembers > 0 ? 
                          ` (${((stats.activeMembers / stats.registeredMembers) * 100).toFixed(1)}% aktivnih)` : 
                          ''}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Kartica aktivnosti */}
              <div
                onClick={() => navigate("/activities")}
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-600 font-medium">Nedavne aktivnosti</h3>
                  <Activity className="h-6 w-6 text-green-600" />
                </div>
                <div className="space-y-2">
                  {statsLoading ? (
                    <div className="h-8 bg-gray-200 animate-pulse rounded-md"></div>
                  ) : (
                    <>
                      <p className="text-2xl font-bold">{stats.recentActivities}</p>
                      <p className="text-sm text-gray-500">U posljednja 24 sata</p>
                    </>
                  )}
                </div>
              </div>

              {/* Kartica registracija koje čekaju */}
              <div
                onClick={() => navigate("/members?filter=pending")}
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-600 font-medium">Registracije na čekanju</h3>
                  <Shield className="h-6 w-6 text-orange-600" />
                </div>
                <div className="space-y-2">
                  {statsLoading ? (
                    <div className="h-8 bg-gray-200 animate-pulse rounded-md"></div>
                  ) : (
                    <>
                      <p className="text-2xl font-bold">{stats.pendingApprovals}</p>
                      <p className="text-sm text-gray-500">Čeka dodjelu lozinke</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Brze akcije */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-medium mb-4">Brzi prečaci</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => navigate("/members")}
                    className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center justify-between group"
                  >
                    <span>Upravljanje članovima</span>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600" />
                  </button>
                  <button
                    onClick={() => navigate("/activities")}
                    className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center justify-between group"
                  >
                    <span>Odobravanje aktivnosti</span>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600" />
                  </button>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-medium mb-4">Status sustava</h3>
                {statsLoading ? (
                  <div className="space-y-4">
                    <div className="h-8 bg-gray-200 animate-pulse rounded-md"></div>
                    <div className="h-8 bg-gray-200 animate-pulse rounded-md"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Zdravlje sustava</p>
                      <div className={`px-3 py-2 rounded-md ${
                        stats.systemHealth === 'Healthy' ? 'bg-green-100 text-green-800' :
                        stats.systemHealth === 'Warning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {stats.systemHealth === 'Healthy' ? 'Zdravo' :
                         stats.systemHealth === 'Warning' ? 'Upozorenje' :
                         'Kritično'}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Zadnja sigurnosna kopija</p>
                      <p className="font-medium">{stats.lastBackup === 'Never' ? 'Nikad' : formatDate(stats.lastBackup, 'dd.MM.yyyy HH:mm:ss')}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div>
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Članovi s administratorskim ovlastima</h2>
              
              {loading ? (
                <div className="text-center py-4">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                  <p className="mt-2 text-gray-600">Učitavanje...</p>
                </div>
              ) : error ? (
                <div className="bg-red-100 text-red-700 p-4 rounded-md">
                  {error}
                </div>
              ) : membersWithPermissions.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <User className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Trenutno nema članova s dodijeljenim administratorskim ovlastima.</p>
                  <button 
                    className="mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md"
                    onClick={() => {/* Implementirati dodavanje ovlasti */}}
                  >
                    Dodaj ovlasti članu
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Član
                        </th>
                        <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ovlasti
                        </th>
                        <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Dodijeljeno
                        </th>
                        <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Akcije
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {membersWithPermissions.map((member) => (
                        <tr key={member.member.member_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                                <User className="h-6 w-6 text-gray-500" />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {member.member.full_name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {member.member.email || 'Nema email adrese'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(member)
                                .filter(([key, value]) => key.startsWith('can_') && value === true)
                                .map(([key]) => (
                                  <span 
                                    key={key} 
                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                  >
                                    {key.replace('can_', '').replace('_', ' ')}
                                  </span>
                                ))
                              }
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(member.granted_at, 'dd.MM.yyyy HH:mm:ss')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button 
                              className="text-blue-600 hover:text-blue-900 mr-3"
                              onClick={() => {/* Implementirati uređivanje */}}
                            >
                              Uredi
                            </button>
                            <button 
                              className="text-red-600 hover:text-red-900"
                              onClick={() => {/* Implementirati uklanjanje */}}
                            >
                              Ukloni
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button 
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md flex items-center"
                onClick={() => {/* Implementirati dodavanje ovlasti */}}
              >
                <User className="h-4 w-4 mr-2" />
                Dodaj ovlasti novom članu
              </button>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Sistemske postavke</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div 
                  onClick={() => navigate("/system-admin/settings")}
                  className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-600 font-medium">Osnovne postavke</h3>
                    <Settings className="h-6 w-6 text-blue-600" />
                  </div>
                  <p className="text-sm text-gray-500">
                    Upravljanje osnovnim postavkama sustava: duljina broja iskaznice, datum obnove članstva.
                  </p>
                </div>
                
                <div 
                  className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-600 font-medium">Sigurnosne kopije</h3>
                    <Database className="h-6 w-6 text-indigo-600" />
                  </div>
                  <p className="text-sm text-gray-500">
                    Upravljanje sigurnosnim kopijama podataka (u pripremi).
                  </p>
                </div>
                
                <div 
                  onClick={() => navigate("/system-admin/audit-logs")}
                  className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-600 font-medium">Revizijski zapisi</h3>
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="text-sm text-gray-500">
                    Pregled aktivnosti u sustavu i sigurnosnih događaja.
                  </p>
                </div>
                
                <div 
                  className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-600 font-medium">Administratori</h3>
                    <Shield className="h-6 w-6 text-purple-600" />
                  </div>
                  <p className="text-sm text-gray-500">
                    Upravljanje System Admin korisnicima (u pripremi).
                  </p>
                </div>
                
                <div 
                  className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-600 font-medium">Status servera</h3>
                    <Server className="h-6 w-6 text-red-600" />
                  </div>
                  <p className="text-sm text-gray-500">
                    Nadgledanje statusa servera i performansi (u pripremi).
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default SystemAdminDashboard;
