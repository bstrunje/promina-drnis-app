import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@components/ui/card";
import { Member } from "@shared/member";

interface MembershipDetailsCardProps {
  member: Member;
}

const MembershipDetailsCard: React.FC<MembershipDetailsCardProps> = ({
  member,
}) => {
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
  const cardNumber = member.membership_details?.card_number || member.card_number;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Membership Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <label className="text-sm text-gray-500">Card Number: </label>
          <p
            className={`inline-block w-fit px-3 py-1 rounded-lg font-mono ml-2 ${
              cardNumber
                ? getStatusColor(member.life_status)
                : "bg-gray-200 text-gray-600"
            }`}
          >
            {cardNumber || "No card number assigned"}
          </p>
          <div>
            <label className="text-sm text-gray-500">Membership Type</label>
            <p>{member.membership_type}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Role</label>
            <p>{member.role}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MembershipDetailsCard;
