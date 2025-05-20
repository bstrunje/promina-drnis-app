// features/systemAdmin/components/dashboard/SystemStatus.tsx
import React from 'react';
import { SystemAdminDashboardStats } from '../../utils/systemAdminApi';
import { formatDate } from "../../../../utils/dateUtils";

// Komponenta za prikaz statusa sustava na dashboardu
interface SystemStatusProps {
  stats: SystemAdminDashboardStats;
  statsLoading: boolean;
}

const SystemStatus: React.FC<SystemStatusProps> = ({ stats, statsLoading }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-medium mb-4">Status sustava</h3>
      {statsLoading ? (
        <div className="space-y-4">
          <div className="h-6 bg-gray-200 animate-pulse rounded-md"></div>
          <div className="h-6 bg-gray-200 animate-pulse rounded-md"></div>
          <div className="h-6 bg-gray-200 animate-pulse rounded-md"></div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b">
            <span className="text-gray-600">Zdravlje sustava</span>
            <span className={`font-medium ${
              stats.systemHealth === 'Healthy' ? 'text-green-600' :
              stats.systemHealth === 'Warning' ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {stats.systemHealth === 'Healthy' ? 'Zdravo' :
              stats.systemHealth === 'Warning' ? 'Upozorenje' :
              'Kritično'}
            </span>
          </div>
          <div className="flex items-center justify-between pb-2 border-b">
            <span className="text-gray-600">Zadnja sigurnosna kopija</span>
            <span className="text-gray-900">
              {stats.lastBackup === 'Never' ? 'Nikad' : formatDate(stats.lastBackup, 'dd.MM.yyyy HH:mm:ss')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemStatus;
