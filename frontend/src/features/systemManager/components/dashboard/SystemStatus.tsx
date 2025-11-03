// features/systemManager/components/dashboard/SystemStatus.tsx
import React, { useState } from 'react';
import { SystemManagerDashboardStats } from '../../utils/systemManagerApi';
import { formatDate } from "../../../../utils/dateUtils";
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle, XCircle, HardDrive, Cpu } from 'lucide-react';

// Komponenta za prikaz statusa sustava na dashboardu
interface SystemStatusProps {
  stats: SystemManagerDashboardStats;
  statsLoading: boolean;
}

const SystemStatus: React.FC<SystemStatusProps> = ({ stats, statsLoading }) => {
  const [showHealthDetails, setShowHealthDetails] = useState(false);
  const [showBackupDetails, setShowBackupDetails] = useState(false);
  
  // Pomoćna funkcija za prikaz ljudski čitljivih veličina
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Pomoćna funkcija za prikaz trajanja u čitljivom obliku
  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    let result = '';
    if (days > 0) result += `${days} dana `;
    if (hours > 0 || days > 0) result += `${hours} sati `;
    result += `${minutes} min`;
    
    return result;
  };
  
  // Funkcija za prikaz ikone statusa
  const StatusIcon = () => {
    if (stats.systemHealth === 'Healthy') {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    } else if (stats.systemHealth === 'Warning') {
      return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    } else {
      return <XCircle className="w-5 h-5 text-red-600" />;
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-medium mb-4">System Status</h3>
      {statsLoading ? (
        <div className="space-y-4">
          <div className="h-6 bg-gray-200 animate-pulse rounded-md"></div>
          <div className="h-6 bg-gray-200 animate-pulse rounded-md"></div>
          <div className="h-6 bg-gray-200 animate-pulse rounded-md"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Osnovni prikaz zdravlja sustava */}
          <div className="flex items-center justify-between pb-2 border-b">
            <div className="flex items-center space-x-2">
              <span className="text-gray-600">System Health</span>
              <StatusIcon />
            </div>
            <div className="flex items-center">
              <span className={`font-medium mr-2 ${
                stats.systemHealth === 'Healthy' ? 'text-green-600' :
                stats.systemHealth === 'Warning' ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {stats.systemHealth === 'Healthy' ? 'Healthy' :
                stats.systemHealth === 'Warning' ? 'Warning' :
                'Critical'}
              </span>
              {stats.healthDetails && (
                <button 
                  onClick={() => setShowHealthDetails(!showHealthDetails)}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                >
                  {showHealthDetails ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          </div>
          
          {/* Detalji zdravlja sustava */}
          {showHealthDetails && stats.healthDetails && (
            <div className="bg-gray-50 p-3 rounded-md mb-2 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Informacije o povezanosti s bazom */}
                <div className="space-y-1">
                  <div className="font-medium text-gray-700">Database:</div>
                  <div className="flex items-center">
                    {stats.healthDetails.dbConnection ? (
                      <span className="text-green-600 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-1" /> Connected
                      </span>
                    ) : (
                      <span className="text-red-600 flex items-center">
                        <XCircle className="w-4 h-4 mr-1" /> Connection Error
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Informacije o disku */}
                <div className="space-y-1">
                  <div className="font-medium text-gray-700 flex items-center">
                    <HardDrive className="w-4 h-4 mr-1" /> Disk:
                  </div>
                  <div>
                    {typeof stats.healthDetails.diskSpace?.percentUsed === 'number' ? (
                      <>
                        Used: {stats.healthDetails.diskSpace.percentUsed}%
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full ${
                              stats.healthDetails.diskSpace.percentUsed > 90 ? 'bg-red-500' :
                              stats.healthDetails.diskSpace.percentUsed > 70 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${stats.healthDetails.diskSpace.percentUsed}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          Free: {formatBytes(stats.healthDetails.diskSpace.available ?? 0)} of {formatBytes(stats.healthDetails.diskSpace.total ?? 0)}
                        </div>
                      </>
                    ) : (
                      <span className="text-gray-600">N/A</span>
                    )}
                  </div>
                </div>
                
                {/* Informacije o memoriji */}
                <div className="space-y-1">
                  <div className="font-medium text-gray-700 flex items-center">
                    <Cpu className="w-4 h-4 mr-1" /> Memory:
                  </div>
                  <div>
                    {typeof stats.healthDetails.memory?.percentUsed === 'number' ? (
                      <>
                        Used: {stats.healthDetails.memory.percentUsed}%
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full ${
                              stats.healthDetails.memory.percentUsed > 90 ? 'bg-red-500' :
                              stats.healthDetails.memory.percentUsed > 70 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${stats.healthDetails.memory.percentUsed}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          Free: {formatBytes(stats.healthDetails.memory.available ?? 0)} of {formatBytes(stats.healthDetails.memory.total ?? 0)}
                        </div>
                      </>
                    ) : (
                      <span className="text-gray-600">N/A</span>
                    )}
                  </div>
                </div>
                
                {/* Uptime */}
                <div className="space-y-1">
                  <div className="font-medium text-gray-700">Uptime:</div>
                  <div>{typeof stats.healthDetails.uptime === 'number' ? formatUptime(stats.healthDetails.uptime) : 'N/A'}</div>
                  <div className="text-xs text-gray-600">
                    Last check: {stats.healthDetails.lastCheck ? formatDate(stats.healthDetails.lastCheck, 'dd.MM.yyyy HH:mm') : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Informacije o sigurnosnoj kopiji */}
          {stats.systemSettings && (
            <>
              <div className="flex items-center justify-between pb-2 border-b">
                <span className="text-gray-600">Last Backup</span>
                <div className="flex items-center">
                  <span className="text-gray-900 mr-2">
                    {stats.systemSettings.lastBackupAt ? formatDate(stats.systemSettings.lastBackupAt, 'dd.MM.yyyy HH:mm') : 'Never'}
                  </span>
                  <button 
                    onClick={() => setShowBackupDetails(!showBackupDetails)}
                    className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                  >
                    {showBackupDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Detalji sigurnosne kopije */}
              {showBackupDetails && (
                <div className="bg-gray-50 p-3 rounded-md text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Frequency:</span>
                      <span className="font-medium">{stats.systemSettings.backupFrequency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Retention:</span>
                      <span>{stats.systemSettings.backupRetentionDays} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Location:</span>
                      <span>{stats.systemSettings.backupStorageLocation}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Next Backup:</span>
                      <span>{stats.systemSettings.nextBackupAt ? formatDate(stats.systemSettings.nextBackupAt, 'dd.MM.yyyy HH:mm') : 'Not scheduled'}</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SystemStatus;
