import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@components/ui/card";
import { Member } from "@shared/member";
import { Clock, CreditCard } from 'lucide-react';
import { useAuth } from "../src/context/AuthContext";
import { formatMinutesToHoursAndMinutes } from "../src/utils/dateUtils";

interface MembershipDetailsCardProps {
  member: Member;
}

const MembershipDetailsCard: React.FC<MembershipDetailsCardProps> = ({
  member,
}) => {
  const { user } = useAuth();
  
  const getStatusColor = (status: Member["life_status"]) => {
    switch (status) {
      case "employed/unemployed":
        return "bg-blue-200 text-bg-blue-800";
      case "child/pupil/student":
        return "bg-green-200 text-bg-green-800";
      case "pensioner":
        return "bg-red-200 text-bg-red-800";
      default:
        return "bg-gray-600 text-white";
    }
  };

  // Get card number from membership_details first (source of truth), fall back to direct property
  const cardNumber = member.membership_details?.card_number ?? member.membership_details?.card_number;
  
  // Provjeri je li korisnik administrator ili superuser
  const canViewCardNumber = user?.role === "member_administrator" || user?.role === "member_superuser";

  // Activity status calculation (moved from MemberActivityStatus)
  const getActivityStatus = (totalMinutes: number) => {
    // Pretvaramo minute u sate za usporedbu
    const hoursValue = totalMinutes / 60;
    console.log('MembershipDetailsCard - Total minutes:', totalMinutes, 'Hours:', hoursValue, 'Status:', hoursValue >= 20 ? "active" : "passive");
    return hoursValue >= 20 ? "active" : "passive";
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>
          <div className="flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Membership Details
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-500">Card Number: </label>
            {cardNumber ? (
              canViewCardNumber ? (
                <p
                  className={`inline-block w-fit px-3 py-1 rounded-lg font-mono ml-2 ${
                    getStatusColor(member.life_status)
                  }`}
                >
                  {cardNumber}
                </p>
              ) : (
                <p className="text-gray-500">
                  <span className="inline-block px-3 py-1 bg-gray-100 rounded-lg">
                    *** Skriveno ***
                  </span>
                  <span className="text-xs ml-2 text-gray-400">
                    (Vidljivo samo administratorima)
                  </span>
                </p>
              )
            ) : (
              <p className="text-gray-400 ml-2">No card number assigned</p>
            )}
          </div>
          <div>
            <label className="text-sm text-gray-500">Status markice</label>
            <div className="flex items-center mt-1">
              <div className={`w-4 h-4 rounded-sm flex items-center justify-center mr-3 ${member.membership_details?.card_stamp_issued ? 'bg-black text-white' : 'border border-gray-300'}`}>
                {member.membership_details?.card_stamp_issued && '✓'}
              </div>
              <span className="text-sm">
                {member.membership_details?.card_stamp_issued ? 'Markica izdana' : 'Markica nije izdana'}
              </span>
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-500">Membership Type</label>
            <p>{member.membership_type}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Role</label>
            <p>{member.role}</p>
          </div>

          {/* Activity Status section (moved from MemberActivityStatus component) */}
          <div className="mt-8 pt-4 border-t border-gray-200">
            <h3 className="text-lg font-medium flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5" />
              Activity Status
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">Total Hours</label>
                <p className="text-2xl font-bold">
                  {formatMinutesToHoursAndMinutes(member?.total_hours ?? 0)}
                </p>
              </div>
              {getActivityStatus(Number(member?.total_hours ?? 0)) === "passive" && (
                <div className="text-yellow-600">
                  <p>
                    Need {Math.ceil(20 - (Number(member?.total_hours ?? 0) / 60))} more
                    hours to become active
                  </p>
                </div>
              )}
              <div>
                <label className="text-sm text-gray-500">Status</label>
                <p>{getActivityStatus(Number(member?.total_hours ?? 0))}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MembershipDetailsCard;
