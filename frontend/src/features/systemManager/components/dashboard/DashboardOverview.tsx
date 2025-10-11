// features/systemManager/components/dashboard/DashboardOverview.tsx
import React from 'react';
import { RefreshCw } from 'lucide-react';
import { SystemManagerDashboardStats } from '../../utils/systemManagerApi';
import DashboardStats from './DashboardStats';

import SystemStatus from './SystemStatus';

// Komponenta za prikaz pregleda sustava (dashboard)
interface DashboardOverviewProps {
  stats: SystemManagerDashboardStats;
  statsLoading: boolean;
  statsError: string | null;
  refreshDashboardStats: () => Promise<void>;
  setActiveTab: (tab: 'dashboard' | 'members' | 'settings' | 'register-members' | 'audit-logs') => void;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  stats,
  statsLoading,
  statsError,
  refreshDashboardStats,
  setActiveTab
}) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => { void refreshDashboardStats(); }}
          disabled={statsLoading}
          className="flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${statsLoading ? 'animate-spin' : ''}`} />
          {statsLoading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {statsError && (
        <div className="bg-red-100 text-red-700 p-4 rounded-md mb-6">
          {statsError}
        </div>
      )}

      {/* Statistike članova, aktivnosti i registracija */}
      <DashboardStats stats={stats} statsLoading={statsLoading} setActiveTab={setActiveTab} />

      {/* System Status */}
      <SystemStatus stats={stats} statsLoading={statsLoading} />
    </div>
  );
};

export default DashboardOverview;
