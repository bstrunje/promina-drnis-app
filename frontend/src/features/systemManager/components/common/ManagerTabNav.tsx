// features/systemManager/components/common/ManagerTabNav.tsx
import React from 'react';
import { Activity, Settings, FileText, Building2 } from 'lucide-react';
import { useSystemManager } from '../../../../context/SystemManagerContext';

// Komponenta za navigacijske tabove u System Manager panelu
interface ManagerTabNavProps {
  activeTab: 'dashboard' | 'settings' | 'register-members' | 'audit-logs' | 'organizations';
  setActiveTab: (tab: 'dashboard' | 'settings' | 'register-members' | 'audit-logs' | 'organizations') => void;
}

const ManagerTabNav: React.FC<ManagerTabNavProps> = ({ activeTab, setActiveTab }) => {
  const { manager } = useSystemManager();
  const isGlobalManager = manager?.organization_id === null;
  return (
    <div className="flex border-b mb-4">
      <button
        className={`px-4 py-2 font-medium ${
          activeTab === 'dashboard'
            ? 'text-blue-600 border-b-2 border-blue-600'
            : 'text-gray-600 hover:text-blue-600'
        }`}
        onClick={() => { void setActiveTab('dashboard'); }}
      >
        <div className="flex items-center">
          <Activity className="h-4 w-4 mr-2" />
          <span>System Overview</span>
        </div>
      </button>
      {/* System Settings - samo za Organization-specific System Manager */}
      {!isGlobalManager && (
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'settings'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => { void setActiveTab('settings'); }}
        >
          <div className="flex items-center">
            <Settings className="h-4 w-4 mr-2" />
            <span>System Settings</span>
          </div>
        </button>
      )}
      {/* Organizations - samo za Global System Manager */}
      {isGlobalManager && (
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'organizations'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => { void setActiveTab('organizations'); }}
        >
          <div className="flex items-center">
            <Building2 className="h-4 w-4 mr-2" />
            <span>Organizations</span>
          </div>
        </button>
      )}
      <button
        className={`px-4 py-2 font-medium ${
          activeTab === 'audit-logs'
            ? 'text-blue-600 border-b-2 border-blue-600'
            : 'text-gray-600 hover:text-blue-600'
        }`}
        onClick={() => { void setActiveTab('audit-logs'); }}
      >
        <div className="flex items-center">
          <FileText className="h-4 w-4 mr-2" />
          <span>Audit Logs</span>
        </div>
      </button>

    </div>
  );
};

export default ManagerTabNav;
