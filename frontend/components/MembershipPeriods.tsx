import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/card';
import { Calendar } from 'lucide-react';
import { Member } from '@shared/types/member';
import { MembershipPeriod } from '@shared/types/membership';

interface MembershipPeriodsProps {
  member: Member;
  periods: MembershipPeriod[];
  totalDuration?: string;
}

const MembershipPeriods: React.FC<MembershipPeriodsProps> = ({ member, periods }) => {
  if (!periods || periods.length === 0) {
    return null; // or return some placeholder/empty state UI
}
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <h2>Membership History</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {periods.map((period, index) => (
            <div key={index} className="border-l-2 border-purple-500 pl-4 py-2">
              <div className="text-sm">
                <span className="font-medium">Start: </span>
                {new Date(period.start_date).toLocaleDateString()}
              </div>
              {period.end_date && (
                <>
                  <div className="text-sm">
                    <span className="font-medium">End: </span>
                    {new Date(period.end_date).toLocaleDateString()}
                  </div>
                  {period.end_reason && (
                    <div className="text-sm text-gray-600">
                      Reason: {period.end_reason}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
          {member.membership_history?.total_duration && (
            <div className="mt-4 pt-4 border-t">
              <span className="text-sm font-medium">Total Duration: </span>
              <span className="text-sm">{member.membership_history.total_duration}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MembershipPeriods;