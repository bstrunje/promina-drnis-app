// features/systemManager/components/dashboard/DashboardStats.tsx
import React, { useState } from 'react';
import { Users, Activity, Shield } from 'lucide-react';
import { SystemManagerDashboardStats } from '../../utils/systemManagerApi';
import StatisticCard from './StatisticCard';
import RecentActivities from './RecentActivities';

// Komponenta za prikaz svih statističkih kartica na dashboardu
interface DashboardStatsProps {
  stats: SystemManagerDashboardStats;
  statsLoading: boolean;
  setActiveTab: (tab: 'dashboard' | 'members' | 'settings' | 'register-members' | 'audit-logs' | 'organizations') => void;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ stats, statsLoading, setActiveTab }) => {
  const [showRecentActivities, setShowRecentActivities] = useState(false);

  // Napomena: Ovaj tip navigacije uzrokuje preusmjeravanje na Login Page
  // TODO: Prilagoditi navigaciju specifično za System Manager područje
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
      {/* Kartica članova - klik otvara listu članova */}
      <StatisticCard
        title="Members"
        icon={<Users className="h-6 w-6 text-blue-600" />}
        value={stats?.totalMembers ?? 0}
        subtitle={
          `${stats?.registeredMembers ?? 0} registered, ${stats?.activeMembers ?? 0} active 
          ${(stats?.registeredMembers ?? 0) > 0 ? 
            ` (${(((stats?.activeMembers ?? 0) / (stats?.registeredMembers ?? 1)) * 100).toFixed(1)}% active)` : 
            ''}`
        }
        loading={statsLoading}
        onClick={() => { void setActiveTab('members'); }}
      />

      {/* Kartica aktivnosti */}
      <StatisticCard
        title="Recent Activities"
        icon={<Activity className="h-6 w-6 text-green-600" />}
        value={stats?.recentActivities ?? 0}
        subtitle="In the last 30 days"
        loading={statsLoading}
        onClick={() => setShowRecentActivities(!showRecentActivities)}
        showChevron={true}
        isExpanded={showRecentActivities}
      />
      {showRecentActivities && <div className="md:col-span-2 lg:col-span-3"><RecentActivities activities={stats.recentActivitiesList} /></div>}

      {/* Kartica registracija koje čekaju */}
      <StatisticCard
        title="Pending Registrations"
        icon={<Shield className="h-6 w-6 text-orange-600" />}
        value={stats?.pendingRegistrations ?? 0}
        subtitle="Awaiting Password Assignment"
        loading={statsLoading}
        onClick={() => { void setActiveTab('register-members'); }}
      />
    </div>
  );
};

export default DashboardStats;
