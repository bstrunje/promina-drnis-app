// features/systemAdmin/components/dashboard/DashboardStats.tsx
import React from 'react';
import { Users, Activity, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SystemAdminDashboardStats } from '../../systemAdminApi';
import StatisticCard from './StatisticCard';

// Komponenta za prikaz svih statističkih kartica na dashboardu
interface DashboardStatsProps {
  stats: SystemAdminDashboardStats;
  statsLoading: boolean;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ stats, statsLoading }) => {
  const navigate = useNavigate();

  // Napomena: Ovaj tip navigacije uzrokuje preusmjeravanje na Login Page
  // TODO: Prilagoditi navigaciju specifično za System Admin područje
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
      {/* Kartica članova */}
      <StatisticCard
        title="Članovi"
        icon={<Users className="h-6 w-6 text-blue-600" />}
        value={stats.totalMembers}
        subtitle={
          `${stats.registeredMembers} registriranih, ${stats.activeMembers} aktivnih 
          ${stats.registeredMembers > 0 ? 
            ` (${((stats.activeMembers / stats.registeredMembers) * 100).toFixed(1)}% aktivnih)` : 
            ''}`
        }
        loading={statsLoading}
        onClick={() => navigate("/members")}
      />

      {/* Kartica aktivnosti */}
      <StatisticCard
        title="Nedavne aktivnosti"
        icon={<Activity className="h-6 w-6 text-green-600" />}
        value={stats.recentActivities}
        subtitle="U posljednja 24 sata"
        loading={statsLoading}
        onClick={() => navigate("/activities")}
      />

      {/* Kartica registracija koje čekaju */}
      <StatisticCard
        title="Registracije na čekanju"
        icon={<Shield className="h-6 w-6 text-orange-600" />}
        value={stats.pendingApprovals}
        subtitle="Čeka dodjelu lozinke"
        loading={statsLoading}
        onClick={() => navigate("/members?filter=pending")}
      />
    </div>
  );
};

export default DashboardStats;
