// features/systemManager/components/dashboard/DashboardStats.tsx
import React from 'react';
import { Users, Activity, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SystemManagerDashboardStats } from '../../utils/systemManagerApi';
import StatisticCard from './StatisticCard';

// Komponenta za prikaz svih statističkih kartica na dashboardu
interface DashboardStatsProps {
  stats: SystemManagerDashboardStats;
  statsLoading: boolean;
  setActiveTab: (tab: 'dashboard' | 'members' | 'settings' | 'register-members' | 'audit-logs') => void;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ stats, statsLoading, setActiveTab }) => {
  const navigate = useNavigate();

  // Napomena: Ovaj tip navigacije uzrokuje preusmjeravanje na Login Page
  // TODO: Prilagoditi navigaciju specifično za System Manager područje
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
      {/* Kartica članova - samo informativna */}
      <StatisticCard
        title="Članovi"
        icon={<Users className="h-6 w-6 text-blue-600" />}
        value={stats?.totalMembers ?? 0}
        subtitle={
          `${stats?.registeredMembers ?? 0} registriranih, ${stats?.activeMembers ?? 0} aktivnih 
          ${(stats?.registeredMembers ?? 0) > 0 ? 
            ` (${(((stats?.activeMembers ?? 0) / (stats?.registeredMembers ?? 1)) * 100).toFixed(1)}% aktivnih)` : 
            ''}`
        }
        loading={statsLoading}
        // Uklonjen onClick handler da kartica bude samo informativna
      />

      {/* Kartica aktivnosti */}
      <StatisticCard
        title="Nedavne aktivnosti"
        icon={<Activity className="h-6 w-6 text-green-600" />}
        value={stats?.recentActivities ?? 0}
        subtitle="U posljednja 24 sata"
        loading={statsLoading}
        onClick={() => navigate("/activities")}
      />

      {/* Kartica registracija koje čekaju */}
      <StatisticCard
        title="Registracije na čekanju"
        icon={<Shield className="h-6 w-6 text-orange-600" />}
        value={stats?.pendingApprovals ?? 0}
        subtitle="Čeka dodjelu lozinke"
        loading={statsLoading}
        onClick={() => { void setActiveTab('register-members'); }}
      />
    </div>
  );
};

export default DashboardStats;
