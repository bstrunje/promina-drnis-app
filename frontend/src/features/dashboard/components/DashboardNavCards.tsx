import React from "react";
import { NavigateFunction } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  
  return (
    <>
      <div
        onClick={() => navigate("/members")}
        className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium">{t("dashboard.navigation.memberManagement.title")}</h3>
          <Users className="h-5 w-5 text-purple-600" />
        </div>
        <p className="text-sm text-gray-600">
          {t("dashboard.navigation.memberManagement.description")}
        </p>
      </div>

      <div
        onClick={() => navigate("/activities")}
        className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium">{t("dashboard.navigation.activityManagement.title")}</h3>
          <Activity className="h-5 w-5 text-purple-600" />
        </div>
        <p className="text-sm text-gray-600">{t("dashboard.navigation.activityManagement.description")}</p>
      </div>

      <div
        onClick={() => navigate("/messages")}
        className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium">{t("dashboard.navigation.messages.title")}</h3>
          <Mail className="h-5 w-5 text-purple-600" />
        </div>
        <p className="text-sm text-gray-600">
          {unreadMessages ? (
            <span className="text-red-600">{t("dashboard.navigation.messages.unreadMessages")}</span>
          ) : (
            t("dashboard.navigation.messages.noUnreadMessages")
          )}
        </p>
      </div>
    </>
  );
};
