// features/systemManager/components/dashboard/DashboardOverview.tsx
import React from 'react';
import { RefreshCw } from 'lucide-react';
import { SystemManagerDashboardStats } from '../../utils/systemManagerApi';
import DashboardStats from './DashboardStats';
import QuickLinks from './QuickLinks';
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
        <h2 className="text-xl font-semibold">Pregled sustava</h2>
        
        <button 
          onClick={() => { void refreshDashboardStats(); }} 
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

      {/* Statistike članova, aktivnosti i registracija */}
      <DashboardStats stats={stats} statsLoading={statsLoading} setActiveTab={setActiveTab} />
      
      {/* Grid za brze prečace i status sustava */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <QuickLinks />
        <SystemStatus stats={stats} statsLoading={statsLoading} />
      </div>
    </div>
  );
};

export default DashboardOverview;
