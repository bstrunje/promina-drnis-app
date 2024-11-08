// src/components/activities/ActivitiesList.tsx
import { Activity } from 'lucide-react';

const ActivitiesList = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Activities</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Create Activity
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center h-40 text-gray-500">
          <div className="text-center">
            <Activity className="h-12 w-12 mx-auto mb-2" />
            <p>No activities recorded yet</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivitiesList;