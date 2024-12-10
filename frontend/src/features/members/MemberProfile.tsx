// frontend/src/features/members/MemberProfile.tsx
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/card';
import { Clock, Calendar, Award, User } from 'lucide-react';

const MemberProfile = () => {
  const { user } = useAuth();

  if (!user) {
    return <div>Loading...</div>;
  }

  const getActivityStatus = () => {
    const hours = user.total_hours ?? 0;
    return {
      status: hours >= 20 ? 'active' : 'passive',
      hours: hours
    };
  };

  const activityStatus = getActivityStatus();

  return (
    <div className="p-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-lg text-white p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">{user.first_name} {user.last_name}</h1>
            <p className="opacity-90">Member Profile</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm ${
            activityStatus.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'
          }`}>
            {activityStatus.status.charAt(0).toUpperCase() + activityStatus.status.slice(1)} Member
          </span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">Email</label>
                <p>{user.email}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Phone</label>
                <p>{user.cell_phone}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Address</label>
                <p>{user.street_address}</p>
                <p>{user.city}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Life Status</label>
                <p>{user.life_status}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Activity Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">Total Hours</label>
                <p className="text-2xl font-bold">{activityStatus.hours}</p>
              </div>
              {activityStatus.status === 'passive' && (
                <div className="text-yellow-600">
                  <p>Need {20 - activityStatus.hours} more hours to become active</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Membership Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Membership Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">Member Since</label>
                <p>{new Date(user.date_of_birth).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Membership Type</label>
                <p>{user.membership_type}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Status</label>
                <p>{user.registration_completed ? 'Registered' : 'Pending'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Equipment Sizes Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Equipment Sizes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">T-Shirt Size</label>
                <p>{user.tshirt_size}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Shell Jacket Size</label>
                <p>{user.shell_jacket_size}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MemberProfile;