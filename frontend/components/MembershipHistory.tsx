import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/card';
import { Calendar } from 'lucide-react';
import { MembershipPeriod } from '@shared/types/membership';

interface MembershipHistoryProps {
  periods: MembershipPeriod[];
  feePaymentYear?: number;
  feePaymentDate?: string;
  totalDuration?: string;
  currentPeriod?: MembershipPeriod;
}

const MembershipHistory: React.FC<MembershipHistoryProps> = ({ 
  periods, 
  feePaymentYear, 
  feePaymentDate,
  totalDuration
}) => {
  if (!periods || periods.length === 0) {
    return null;
  }

  const currentPeriod = periods[periods.length - 1].end_date ? null : periods[periods.length - 1];

  const calculateTotalDuration = (periods: MembershipPeriod[]): string => {
    const totalDays = periods.reduce((total, period) => {
      const start = new Date(period.start_date);
      const end = period.end_date ? new Date(period.end_date) : new Date();
      return total + Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }, 0);

    const years = Math.floor(totalDays / 365);
    const months = Math.floor((totalDays % 365) / 30);
    const days = totalDays % 30;

    return `${years} years, ${months} months, ${days} days`;
  };

  const formatFeePaymentInfo = (year?: number, date?: string): string => {
    if (!year || !date) return 'No payment information available';

    const paymentDate = new Date(date);
    const paymentMonth = paymentDate.getMonth();
    
    if (paymentMonth >= 10) { // November or December
      return `Payment for ${year} (next year) - paid on ${paymentDate.toLocaleDateString()}`;
    } else {
      return `Payment for ${year} (current year) - paid on ${paymentDate.toLocaleDateString()}`;
    }
  };

  const isCurrentMembershipActive = (): boolean => {
    if (!feePaymentYear || !feePaymentDate) return false;
  
    const now = new Date();
    const currentYear = now.getFullYear();
    const paymentDate = new Date(feePaymentDate);
    const paymentMonth = paymentDate.getMonth();
  
    // Članstvo je aktivno ako je uplata za tekuću godinu ili
    // ako je uplata izvršena u studenom ili prosincu prethodne godine za tekuću godinu
    return (feePaymentYear === currentYear) || 
           (feePaymentYear === currentYear && feePaymentYear === currentYear && paymentMonth >= 10);
  };

  const getMembershipType = (): string => {
    if (!feePaymentYear || !feePaymentDate) return 'Unknown';
  
    const paymentDate = new Date(feePaymentDate);
    const paymentMonth = paymentDate.getMonth();
    const now = new Date();
    const currentYear = now.getFullYear();
  
    if (paymentMonth >= 10 && feePaymentYear === currentYear + 1) {
      return 'Renewed membership';
    } else if (feePaymentYear === currentYear) {
      return 'New membership';
    } else {
      return 'Past membership';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Membership History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm">
            <span className="font-medium">Total Duration: </span>
            {totalDuration || calculateTotalDuration(periods)}
          </div>

          <div className="text-sm">
            <span className="font-medium">Last Fee Payment: </span>
            {formatFeePaymentInfo(feePaymentYear, feePaymentDate)}
          </div>

          <div className="text-sm">
            <span className="font-medium">Membership Status: </span>
            {isCurrentMembershipActive() ? 'Active' : 'Inactive'}
          </div>

          <div className="text-sm">
            <span className="font-medium">Membership Type: </span>
            {getMembershipType()}
          </div>
          
          <div className="space-y-2">
            {periods.map((period: MembershipPeriod, index: number) => (
              <div key={period.period_id} className="border-l-2 border-purple-500 pl-4 py-2">
                <div className="text-sm font-medium">
                  Period {periods.length - index}:
                </div>
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
            )).reverse()}
          </div>
          
          {currentPeriod && (
            <div className="mt-4 pt-4 border-t">
              <span className="text-sm font-medium">Current Period: </span>
              <span className="text-sm">
                {new Date(currentPeriod.start_date).toLocaleDateString()} - Present
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MembershipHistory;