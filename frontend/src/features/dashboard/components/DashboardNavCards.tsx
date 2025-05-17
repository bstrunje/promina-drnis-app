import React from "react";
import { NavigateFunction } from "react-router-dom";
import { Users, Activity, Mail } from "lucide-react";

interface DashboardNavCardsProps {
  navigate: NavigateFunction;
  unreadMessages: boolean;
}

/**
 * Komponenta za prikaz navigacijskih kartica na admin dashboardu
 */
export const DashboardNavCards: React.FC<DashboardNavCardsProps> = ({ 
  navigate, 
  unreadMessages 
}) => {
  return (
    <>
      <div
        onClick={() => navigate("/members")}
        className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium">Member Management</h3>
          <Users className="h-5 w-5 text-purple-600" />
        </div>
        <p className="text-sm text-gray-600">
          Manage member accounts and permissions
        </p>
      </div>

      <div
        onClick={() => navigate("/activities")}
        className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium">Activity Management</h3>
          <Activity className="h-5 w-5 text-purple-600" />
        </div>
        <p className="text-sm text-gray-600">Manage and monitor activities</p>
      </div>

      <div
        onClick={() => navigate("/messages")}
        className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium">Messages</h3>
          <Mail className="h-5 w-5 text-purple-600" />
        </div>
        <p className="text-sm text-gray-600">
          {unreadMessages ? (
            <span className="text-red-600">There are unread messages</span>
          ) : (
            "No unread messages"
          )}
        </p>
      </div>
    </>
  );
};
