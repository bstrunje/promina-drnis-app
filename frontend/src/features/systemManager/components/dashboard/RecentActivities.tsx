import React from 'react';

interface Participant {
  id: string | number;
  name: string;
}

interface Activity {
  activity_id: string | number;
  name: string;
  activity_type: {
    name: string;
    custom_label?: string | null;
  };
  participants: Participant[];
  start_date: string | Date;
}

interface RecentActivitiesProps {
  activities: Activity[];
}

const RecentActivities: React.FC<RecentActivitiesProps> = ({ activities }) => {
  if (!activities || activities.length === 0) {
    return (
      <div className="bg-gray-50 p-3 rounded-md text-sm text-center text-gray-500">
        No recent activities.
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-3 rounded-md text-sm space-y-2">
      {activities.map(activity => (
        <div key={activity.activity_id} className="flex justify-between items-center p-2 rounded-md hover:bg-gray-100">
          <div>
            <div className="font-medium">{activity.name}</div>
            <div className="text-xs text-gray-500">{activity.activity_type.custom_label ?? activity.activity_type.name}</div>
          </div>
          <div className="text-right">
            <div className="font-medium">{activity.participants.length} participants</div>
            <div className="text-xs text-gray-500">{new Date(activity.start_date).toLocaleDateString()}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecentActivities;