import { Link } from 'react-router-dom';
import { Users, Activity, Clock, CalendarDays } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Members Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Members Card */}
        <Link to="/members" className="block">
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <Users className="h-8 w-8 text-blue-500" />
                <h2 className="text-xl font-semibold text-gray-800 mt-2">Members</h2>
                <p className="text-gray-600">Manage members</p>
              </div>
            </div>
          </div>
        </Link>

        {/* Activities Card */}
        <Link to="/activities" className="block">
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <Activity className="h-8 w-8 text-green-500" />
                <h2 className="text-xl font-semibold text-gray-800 mt-2">Activities</h2>
                <p className="text-gray-600">Track activities</p>
              </div>
            </div>
          </div>
        </Link>

        {/* Hours Log Card */}
        <Link to="/hours" className="block">
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <Clock className="h-8 w-8 text-purple-500" />
                <h2 className="text-xl font-semibold text-gray-800 mt-2">Hours Log</h2>
                <p className="text-gray-600">Record hours</p>
              </div>
            </div>
          </div>
        </Link>

        {/* Events Card */}
        <Link to="/events" className="block">
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <CalendarDays className="h-8 w-8 text-orange-500" />
                <h2 className="text-xl font-semibold text-gray-800 mt-2">Events</h2>
                <p className="text-gray-600">Upcoming events</p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Quick Stats Section */}
      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Stats</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600">Total Members</p>
            <p className="text-2xl font-bold text-blue-600">0</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600">Active Members</p>
            <p className="text-2xl font-bold text-green-600">0</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-600">Total Hours This Month</p>
            <p className="text-2xl font-bold text-purple-600">0</p>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <p className="text-sm text-gray-600">Upcoming Events</p>
            <p className="text-2xl font-bold text-orange-600">0</p>
          </div>
        </div>
      </div>
    </div>
  );
}