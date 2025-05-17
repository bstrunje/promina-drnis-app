import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/card';
import { Clock } from 'lucide-react';
import { Member } from '@shared/member';

interface MemberActivityStatusProps {
  member: Member;
}

const MemberActivityStatus: React.FC<MemberActivityStatusProps> = ({ member }) => {
  const getActivityStatus = (totalHours: number) => {
    return totalHours >= 20 ? "active" : "passive";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Activity Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-500">Total Hours</label>
            <p className="text-2xl font-bold">
              {member?.total_hours ?? 0}
            </p>
          </div>
          {getActivityStatus(Number(member?.total_hours) || 0) === "passive" && (
            <div className="text-yellow-600">
              <p>
                Need {20 - (Number(member?.total_hours) || 0)} more
                hours to become active
              </p>
            </div>
          )}
          <div>
            <label className="text-sm text-gray-500">Status</label>
            <p>{getActivityStatus(Number(member?.total_hours) || 0)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MemberActivityStatus;