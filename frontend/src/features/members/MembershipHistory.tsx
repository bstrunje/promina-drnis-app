import React from 'react';
import { MembershipPeriod } from '@shared/types/membership';
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/card';

interface Props {
  periods: MembershipPeriod[];
  totalDuration: string;
}

const MembershipHistory: React.FC<Props> = ({ periods, totalDuration }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Membership History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm">
            <span className="font-medium">Total Duration: </span>
            {totalDuration}
          </div>
          
          <div className="space-y-2">
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MembershipHistory;