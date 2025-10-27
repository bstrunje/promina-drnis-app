// features/systemManager/components/common/ManagerTabNav.tsx
import React from 'react';
import { Activity, Settings, FileText, Building2, Shield, Headphones, LogOut } from 'lucide-react';
import { useSystemManager } from '../../../../context/SystemManagerContext';

// Komponenta za navigacijske tabove u System Manager panelu
interface ManagerTabNavProps {
  activeTab: 'dashboard' | 'members' | 'settings' | 'register-members' | 'audit-logs' | 'organizations' | 'support';
  setActiveTab: (tab: 'dashboard' | 'members' | 'settings' | 'register-members' | 'audit-logs' | 'organizations' | 'support') => void;
  isMenuOpen?: boolean;
  onMenuClose?: () => void;
}

const ManagerTabNav: React.FC<ManagerTabNavProps> = ({ activeTab, setActiveTab, isMenuOpen, onMenuClose }) => {
  const { manager, logout } = useSystemManager();
  const isGlobalManager = manager?.organization_id === null;

  const handleTabClick = (tab: typeof activeTab) => {
    setActiveTab(tab);
    onMenuClose?.();
  };

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      <div
        className={`lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity ${
          isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onMenuClose}
      />
      
      {/* Mobile Sidebar */}
      <div
        className={`lg:hidden fixed left-0 top-0 h-full w-64 bg-white shadow-lg z-50 transform transition-transform ${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b">
          <div className="text-sm text-gray-600 mb-1">Logged:</div>
          <div className="font-medium text-gray-800 truncate">{manager?.display_name}</div>
        </div>
        <nav className="flex flex-col p-2">
          <button
            className={`px-4 py-3 rounded-lg text-left flex items-center space-x-3 ${
              activeTab === 'dashboard'
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => { void handleTabClick('dashboard'); }}
          >
            <Activity className="h-5 w-5" />
            <span>System Overview</span>
          </button>

          {!isGlobalManager && (
            <button
              className={`px-4 py-3 rounded-lg text-left flex items-center space-x-3 ${
                activeTab === 'settings'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => { void handleTabClick('settings'); }}
            >
              <Settings className="h-5 w-5" />
              <span>System Settings</span>
            </button>
          )}

          {isGlobalManager && (
            <button
              className={`px-4 py-3 rounded-lg text-left flex items-center space-x-3 ${
                activeTab === 'organizations'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => { void handleTabClick('organizations'); }}
            >
              <Building2 className="h-5 w-5" />
              <span>Organizations</span>
            </button>
          )}

          {isGlobalManager && (
            <button
              className={`px-4 py-3 rounded-lg text-left flex items-center space-x-3 ${
                activeTab === 'settings'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => { void handleTabClick('settings'); }}
            >
              <Shield className="h-5 w-5" />
              <span>Security Settings</span>
            </button>
          )}

          <button
            className={`px-4 py-3 rounded-lg text-left flex items-center space-x-3 ${
              activeTab === 'support'
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => { void handleTabClick('support'); }}
          >
            <Headphones className="h-5 w-5" />
            <span>Support & Feedback</span>
          </button>

          <button
            className={`px-4 py-3 rounded-lg text-left flex items-center space-x-3 ${
              activeTab === 'audit-logs'
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => { void handleTabClick('audit-logs'); }}
          >
            <FileText className="h-5 w-5" />
            <span>Audit Logs</span>
          </button>

          <div className="border-t mt-2 pt-2">
            <button
              onClick={() => { void logout(); }}
              className="px-4 py-3 rounded-lg text-left flex items-center space-x-3 text-red-600 hover:bg-red-50 w-full"
            >
              <LogOut className="h-5 w-5" />
              <span>Log out</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Desktop Tabs */}
      <div className="hidden lg:flex border-b mb-4">
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

        {isGlobalManager && (
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'settings'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-blue-600'
            }`}
            onClick={() => { void setActiveTab('settings'); }}
          >
            <div className="flex items-center">
              <Shield className="h-4 w-4 mr-2" />
              <span>Security Settings</span>
            </div>
          </button>
        )}

        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'support'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => { void setActiveTab('support'); }}
        >
          <div className="flex items-center">
            <Headphones className="h-4 w-4 mr-2" />
            <span>Support & Feedback</span>
          </div>
        </button>

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
    </>
  );
};

export default ManagerTabNav;
