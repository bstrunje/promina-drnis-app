import React from "react";
import { useTranslation } from "react-i18next";
import { Member } from "@shared/member";

interface DashboardHeaderProps {
  member: Member;
}

/**
 * Komponenta za prikaz zaglavlja admin dashboarda
 */
export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ member }) => {
  const { t } = useTranslation();
  
  return (
    <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-lg text-white p-6 mb-6">
      <h1 className="text-2xl font-bold mb-2">{t("dashboard.header.welcome", { name: member.full_name })}</h1>
      <p className="opacity-90">{t("dashboard.header.adminDashboard")}</p>
    </div>
  );
};
