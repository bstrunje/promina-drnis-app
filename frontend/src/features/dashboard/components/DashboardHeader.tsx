import React from "react";
import { Member } from "@shared/member";

interface DashboardHeaderProps {
  member: Member;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ member }) => {
  // zadržavamo referencu da ne bismo izazvali lint upozorenje ako se prop predaje
  void member;

  return (
    <div className="mb-6 rounded-lg bg-gradient-to-r from-purple-600 to-violet-500 p-6 text-white">
      <h1 className="text-2xl font-semibold">Administratorska nadzorna ploča</h1>
    </div>
  );
};
