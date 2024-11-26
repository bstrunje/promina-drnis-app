import { Calendar, Clock, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { User } from '../../App';

interface Props {
  user: User;
}

const MemberDashboard = ({ user }: Props) => {
  const navigate = useNavigate();
  
  return (
    <div className="p-6">
      <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-lg text-white p-6 mb-6">
        <h1 className="text-2xl font-bold mb-2">Welcome, {user.full_name}</h1>
        <p className="opacity-90">Member Dashboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          onClick={() => navigate('/activities')}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Upcoming Activities</h3>
            <Calendar className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-sm text-gray-600">View and join upcoming activities</p>
        </div>

        <div 
          onClick={() => navigate('/hours')}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">My Hours</h3>
            <Clock className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-sm text-gray-600">Track your activity hours</p>
        </div>

        <div 
          onClick={() => navigate('/achievements')}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
        >
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