import React from "react";
import { Member } from "@shared/member";

interface DashboardHeaderProps {
  member: Member;
}

/**
 * Komponenta za prikaz zaglavlja admin dashboarda
 */
export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ member }) => {
  return (
    <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-lg text-white p-6 mb-6">
      <h1 className="text-2xl font-bold mb-2">Welcome, {member.full_name}</h1>
      <p className="opacity-90">Admin Dashboard</p>
    </div>
  );
};
