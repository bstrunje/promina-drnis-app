// features/systemManager/pages/dashboard/SystemManagerDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useSystemManager } from '../../../../context/SystemManagerContext';
import { useLocation } from 'react-router-dom';
import { useSystemManagerNavigation } from '../../hooks/useSystemManagerNavigation';
import ManagerHeader from '../../components/common/ManagerHeader';
import ManagerTabNav from '../../components/common/ManagerTabNav';
import DashboardOverview from '../../components/dashboard/DashboardOverview';
import MembersWithPermissions from '../../../members/permissions/MembersWithPermissions';
import PendingMembersList from '../../components/members/PendingMembersList';
import SystemManagerSettings from '../settings/SystemManagerSettings';
import useDashboardStats from '../../hooks/useDashboardStats';
import TimeTravel from '../../../../../components/admin/TimeTravel';

/**
 * Glavna komponenta System Manager dashboarda
 * Razdvojena na manje komponente za bolju održivost i preglednost
 */
const SystemManagerDashboard: React.FC = () => {
  const { manager } = useSystemManager();
  const location = useLocation();
  const { navigateTo } = useSystemManagerNavigation();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'members' | 'settings' | 'register-members' | 'audit-logs'>('dashboard');
  
  // Prilagođeno rukovanje tabovima kroz URL
  useEffect(() => {
    // Dobivanje trenutnog taba iz URL-a
    const path = location.pathname;
    if (path.includes('/system-manager/members')) {
      setActiveTab('members');
    } else if (path.includes('/system-manager/settings')) {
      setActiveTab('settings');
    } else if (path.includes('/system-manager/register-members')) {
      setActiveTab('register-members');
    } else if (path.includes('/system-manager/audit-logs')) {
      setActiveTab('audit-logs');
    } else {
      // Default - dashboard
      setActiveTab('dashboard');
    }
  }, [location.pathname]);
  
  // Handler za promjenu taba koji ažurira URL
  const handleTabChange = (tab: 'dashboard' | 'members' | 'settings' | 'register-members' | 'audit-logs') => {
    let targetPath = '/system-manager/';
    if (tab === 'members') {
      targetPath = '/system-manager/members';
    } else if (tab === 'settings') {
      targetPath = '/system-manager/settings';
    } else if (tab === 'register-members') {
      targetPath = '/system-manager/register-members';
    } else if (tab === 'audit-logs') {
      targetPath = '/system-manager/audit-logs';
    } else {
      targetPath = '/system-manager/dashboard';
    }
    
    // Navigiraj na odgovarajući URL s prefixom system-manager
    // Koristimo navigateTo umjesto navigate za konzistentnost
    navigateTo(targetPath);
  };
  
  // Koristimo hook za dohvat statistika dashboarda
  const { stats, statsLoading, statsError, refreshDashboardStats } = useDashboardStats(activeTab);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header komponenta */}
      <ManagerHeader manager={manager} />

      {/* Glavni sadržaj */}
      <main className="container mx-auto p-4">
        {/* Razvojni alati - vidljivi samo u development modu */}
        {import.meta.env.DEV && <TimeTravel />}

        {/* Navigacija između tabova */}
        <ManagerTabNav activeTab={activeTab} setActiveTab={handleTabChange} />

        {/* Tab sadržaj - Dashboard */}
        {activeTab === 'dashboard' && (
          <DashboardOverview
            stats={stats}
            statsLoading={statsLoading}
            statsError={statsError}
            refreshDashboardStats={refreshDashboardStats}
            setActiveTab={handleTabChange}
          />
        )}
        
        {/* Tab sadržaj - Upravljanje ovlastima članova */}
        {/* Upravljanje ovlastima članova uklonjeno iz system manager dashboarda prema novoj organizaciji prava */}
        
        {/* Tab sadržaj - Postavke sustava */}
        {activeTab === 'settings' && (
          <>
            <h2 className="text-xl font-semibold mb-6">Postavke sustava</h2>
            <SystemManagerSettings />
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

export default SystemManagerDashboard;
