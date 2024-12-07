import { Calendar, Clock, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Member } from '@shared/types/member';

interface Props {
  member: Member;
}

const MemberDashboard: React.FC<Props> = ({ member }) => {
  const navigate = useNavigate();

  const getActivityStatus = () => {
    const hours = member.total_hours ?? 0;
    return {
      status: hours >= 20 ? 'active' : 'passive',
      hours: hours
    };
  };
  
  const activityStatus = getActivityStatus();
  
  return (
    <div className="p-6">
      <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-lg text-white p-6 mb-6">
        <h1 className="text-2xl font-bold mb-2">Welcome, {member.full_name}</h1>
        <div className="flex justify-between items-center">
          <p className="opacity-90">Member Dashboard</p>
          <span className={`px-3 py-1 rounded-full text-sm ${
            activityStatus.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'
          }`}>
            {activityStatus.status.charAt(0).toUpperCase() + activityStatus.status.slice(1)} Member
            ({activityStatus.hours} hours)
          </span>
        </div>
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
          {activityStatus.status === 'passive' && (
            <p className="text-xs text-yellow-600 mt-2">
              Need {20 - activityStatus.hours} more hours to become active
            </p>
          )}
        </div>

        <div 
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Membership Details</h3>
            <Award className="h-5 w-5 text-green-600" />
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <p>Type: {member.membership_type}</p>
            <p>Member since: {member.date_of_birth}</p>
            {member.membership_details?.card_number && (
              <p>Card Number: {member.membership_details.card_number}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberDashboard;