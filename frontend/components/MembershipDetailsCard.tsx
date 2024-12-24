import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/card';
import { Member } from '@shared/types/member';

interface MembershipDetailsCardProps {
  member: Member;
}

const MembershipDetailsCard: React.FC<MembershipDetailsCardProps> = ({ member }) => {
  const getStatusColor = (status: Member["life_status"]) => {
    switch (status) {
      case "employed/unemployed":
        return "bg-blue-600 text-white";
      case "child/pupil/student":
        return "bg-green-600 text-white";
      case "pensioner":
        return "bg-red-600 text-white";
      default:
        return "bg-gray-600 text-white";
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Membership Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {member.membership_details?.card_number && (
            <div>
              <label className="text-sm text-gray-500">Card Number</label>
              <p className={`px-3 py-1 rounded-lg font-mono ${getStatusColor(member.life_status)}`}>
                {member.membership_details.card_number}
              </p>
            </div>
          )}
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