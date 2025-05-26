// features/systemAdmin/components/common/AdminTabNav.tsx
import React from 'react';
import { Activity, Users, Settings, UserPlus, FileText } from 'lucide-react';

// Komponenta za navigacijske tabove u System Admin panelu
interface AdminTabNavProps {
  activeTab: 'dashboard' | 'members' | 'settings' | 'register-members' | 'audit-logs';
  setActiveTab: (tab: 'dashboard' | 'members' | 'settings' | 'register-members' | 'audit-logs') => void;
}

const AdminTabNav: React.FC<AdminTabNavProps> = ({ activeTab, setActiveTab }) => {
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
          <span>Pregled sustava</span>
        </div>
      </button>
      <button
        className={`px-4 py-2 font-medium ${
          activeTab === 'members'
            ? 'text-blue-600 border-b-2 border-blue-600'
            : 'text-gray-600 hover:text-blue-600'
        }`}
        onClick={() => { void setActiveTab('members'); }}
      >
        <div className="flex items-center">
          <Users className="h-4 w-4 mr-2" />
          <span>Upravljanje ovlastima članova</span>
        </div>
      </button>
      <button
        className={`px-4 py-2 font-medium ${
          activeTab === 'register-members'
            ? 'text-blue-600 border-b-2 border-blue-600'
            : 'text-gray-600 hover:text-blue-600'
        }`}
        onClick={() => { void setActiveTab('register-members'); }}
      >
        <div className="flex items-center">
          <UserPlus className="h-4 w-4 mr-2" />
          <span>Registracija članova</span>
        </div>
      </button>
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
          <span>Postavke sustava</span>
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
          <span>Revizijski zapisi</span>
        </div>
      </button>
    </div>
  );
};

export default AdminTabNav;
