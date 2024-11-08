// src/components/dashboard/MemberDashboard.tsx

import { Calendar, Clock, Award } from 'lucide-react';

interface User {
  id: string;
  username: string;
  role: string;
}

interface Props {
  user: User;
}

const MemberDashboard = ({ user }: Props) => {
  return (
    <div className="p-6">
      <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-lg text-white p-6 mb-6">
        <h1 className="text-2xl font-bold mb-2">Welcome, {user.username}</h1>
        <p className="opacity-90">Member Dashboard</p>
      </div>

      {/* Placeholder content - we can expand this later */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Upcoming Activities</h3>
            <Calendar className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-sm text-gray-600">View and join upcoming activities</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">My Hours</h3>
            <Clock className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-sm text-gray-600">Track your activity hours</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Achievements</h3>
            <Award className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-sm text-gray-600">View your achievements and progress</p>
        </div>
      </div>
    </div>
  );
};

export default MemberDashboard;