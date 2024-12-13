// frontend/src/features/dashboard/AdminDashboard.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Activity } from 'lucide-react';
import { Member } from '@shared/types/member';

interface Props {
  member: Member;
}

const AdminDashboard: React.FC<Props> = ({ member }) => {
  const navigate = useNavigate();

  return (
    <div className="p-6">
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-lg text-white p-6 mb-6">
        <h1 className="text-2xl font-bold mb-2">Welcome, {member.full_name}</h1>
        <p className="opacity-90">Admin Dashboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div 
          onClick={() => navigate('/members')}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Member Management</h3>
            <Users className="h-5 w-5 text-purple-600" />
          </div>
          <p className="text-sm text-gray-600">Manage member accounts and permissions</p>
        </div>

        <div 
          onClick={() => navigate('/activities')}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Activity Management</h3>
            <Activity className="h-5 w-5 text-purple-600" />
          </div>
          <p className="text-sm text-gray-600">Manage and monitor activities</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;