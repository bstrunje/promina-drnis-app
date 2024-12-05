import { Users, Activity, Shield, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Member } from '@shared/types/member';

interface Props {
  member: Member;
}

interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  pendingApprovals: number;
  recentActivities: number;
  systemHealth: string;
  lastBackup: string;
}

const SuperUserDashboard: React.FC<Props> = ({ member }) => {
  const navigate = useNavigate();
  
  const stats: DashboardStats = {
    totalMembers: 156,
    activeMembers: 124,
    pendingApprovals: 8,
    recentActivities: 12,
    systemHealth: 'Optimal',
    lastBackup: '2024-03-07 15:30'
  };
  
  return (
    <div className="p-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg text-white p-6 mb-6">
        <h1 className="text-2xl font-bold mb-2">Welcome, {member.full_name}</h1>
        <p className="opacity-90">Super User Dashboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <div 
          onClick={() => navigate('/members')}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-600 font-medium">Members</h3>
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <div className="space-y-2">
            <p className="text-2xl font-bold">{stats.totalMembers}</p>
            <p className="text-sm text-gray-500">
              {stats.activeMembers} active members
            </p>
          </div>
        </div>

        <div 
          onClick={() => navigate('/activities')}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-600 font-medium">Recent Activities</h3>
            <Activity className="h-6 w-6 text-green-600" />
          </div>
          <div className="space-y-2">
            <p className="text-2xl font-bold">{stats.recentActivities}</p>
            <p className="text-sm text-gray-500">In the last 24 hours</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-600 font-medium">Pending Approvals</h3>
            <Shield className="h-6 w-6 text-orange-600" />
          </div>
          <div className="space-y-2">
            <p className="text-2xl font-bold">{stats.pendingApprovals}</p>
            <p className="text-sm text-gray-500">Require your attention</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button 
              onClick={() => navigate('/members')}
              className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center justify-between group"
            >
              <span>User Management</span>
              <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600" />
            </button>
            <button 
              onClick={() => navigate('/activities')}
              className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center justify-between group"
            >
              <span>Activity Approvals</span>
              <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600" />
            </button>
            <button 
              onClick={() => navigate('/settings')}
              className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center justify-between group"
            >
              <span>System Settings</span>
              <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600" />
            </button>
            <button 
              onClick={() => navigate('/logs')}
              className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center justify-between group"
            >
              <span>Audit Logs</span>
              <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600" />
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium mb-4">System Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <span className="text-gray-600">System Health</span>
              <span className="text-green-600 font-medium">{stats.systemHealth}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b">
              <span className="text-gray-600">Last Backup</span>
              <span className="text-gray-900">{stats.lastBackup}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Database Status</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Connected
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperUserDashboard;