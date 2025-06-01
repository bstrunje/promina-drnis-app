// features/systemAdmin/pages/dashboard/SystemAdminDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useSystemAdmin } from '../../../../context/SystemAdminContext';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminHeader from '../../components/common/AdminHeader';
import AdminTabNav from '../../components/common/AdminTabNav';
import DashboardOverview from '../../components/dashboard/DashboardOverview';
import MembersWithPermissions from '../../../members/permissions/MembersWithPermissions';
import PendingMembersList from '../../components/members/PendingMembersList';
import SystemAdminSettings from '../settings/SystemAdminSettings';
import useDashboardStats from '../../hooks/useDashboardStats';

/**
 * Glavna komponenta System Admin dashboarda
 * Razdvojena na manje komponente za bolju održivost i preglednost
 */
const SystemAdminDashboard: React.FC = () => {
  const { admin } = useSystemAdmin();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'members' | 'settings' | 'register-members' | 'audit-logs'>('dashboard');
  
  // Prilagođeno rukovanje tabovima kroz URL
  useEffect(() => {
    // Dobivanje trenutnog taba iz URL-a
    const path = location.pathname;
    if (path.includes('/system-admin/members')) {
      setActiveTab('members');
    } else if (path.includes('/system-admin/settings')) {
      setActiveTab('settings');
    } else if (path.includes('/system-admin/register-members')) {
      setActiveTab('register-members');
    } else if (path.includes('/system-admin/audit-logs')) {
      setActiveTab('audit-logs');
    } else {
      // Default - dashboard
      setActiveTab('dashboard');
    }
  }, [location.pathname]);
  
  // Handler za promjenu taba koji ažurira URL
  const handleTabChange = (tab: 'dashboard' | 'members' | 'settings' | 'register-members' | 'audit-logs') => {
    let targetPath = '/system-admin/';
    if (tab === 'members') {
      targetPath = '/system-admin/members';
    } else if (tab === 'settings') {
      targetPath = '/system-admin/settings';
    } else if (tab === 'register-members') {
      targetPath = '/system-admin/register-members';
    } else if (tab === 'audit-logs') {
      targetPath = '/system-admin/audit-logs';
    } else {
      targetPath = '/system-admin/dashboard';
    }
    
    // Navigiraj na odgovarajući URL s prefixom system-admin
    navigate(targetPath);
  };
  
  // Koristimo hook za dohvat statistika dashboarda
  const { stats, statsLoading, statsError, refreshDashboardStats } = useDashboardStats(activeTab);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header komponenta */}
      <AdminHeader admin={admin} />

      {/* Glavni sadržaj */}
      <main className="container mx-auto p-4">
        {/* Navigacija između tabova */}
        <AdminTabNav activeTab={activeTab} setActiveTab={handleTabChange} />

        {/* Tab sadržaj - Dashboard */}
        {activeTab === 'dashboard' && (
          <DashboardOverview
            stats={stats}
            statsLoading={statsLoading}
            statsError={statsError}
            refreshDashboardStats={refreshDashboardStats}
          />
        )}
        
        {/* Tab sadržaj - Upravljanje ovlastima članova */}
        {/* Upravljanje ovlastima članova uklonjeno iz system admin dashboarda prema novoj organizaciji prava */}
        
        {/* Tab sadržaj - Postavke sustava */}
        {activeTab === 'settings' && (
          <>
            <h2 className="text-xl font-semibold mb-6">Postavke sustava</h2>
            <SystemAdminSettings />
          </>
        )}
        
        {/* Tab sadržaj - Registracija članova */}
        {activeTab === 'register-members' && (
          <>
            <h2 className="text-xl font-semibold mb-6">Registracija članova</h2>
            <PendingMembersList />
          </>
        )}
      </main>
    </div>
  );
};

export default SystemAdminDashboard;
