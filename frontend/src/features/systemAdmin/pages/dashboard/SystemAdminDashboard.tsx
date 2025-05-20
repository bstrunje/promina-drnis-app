// features/systemAdmin/pages/dashboard/SystemAdminDashboard.tsx
import React, { useState } from 'react';
import { useSystemAdmin } from '../../../../context/SystemAdminContext';
import AdminHeader from '../../components/common/AdminHeader';
import AdminTabNav from '../../components/common/AdminTabNav';
import DashboardOverview from '../../components/dashboard/DashboardOverview';
import MembersWithPermissions from '../../components/members/MembersWithPermissions';
import useDashboardStats from '../../hooks/useDashboardStats';

/**
 * Glavna komponenta System Admin dashboarda
 * Razdvojena na manje komponente za bolju održivost i preglednost
 */
const SystemAdminDashboard: React.FC = () => {
  const { admin } = useSystemAdmin();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'members' | 'settings'>('dashboard');
  
  // Koristimo hook za dohvat statistika dashboarda
  const { stats, statsLoading, statsError, refreshDashboardStats } = useDashboardStats(activeTab);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header komponenta */}
      <AdminHeader admin={admin} />

      {/* Glavni sadržaj */}
      <main className="container mx-auto p-4">
        {/* Navigacija između tabova */}
        <AdminTabNav activeTab={activeTab} setActiveTab={setActiveTab} />

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
        {activeTab === 'members' && (
          <MembersWithPermissions activeTab={activeTab} />
        )}
        
        {/* Tab sadržaj - Postavke sustava */}
        {activeTab === 'settings' && (
          <div>
            <h2 className="text-xl font-semibold mb-6">Postavke sustava</h2>
            <p className="text-gray-500">
              Postavke sustava će biti implementirane kao posebna komponenta.
              Za sada koristimo postojeću SystemAdminSettings.tsx komponentu.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default SystemAdminDashboard;
