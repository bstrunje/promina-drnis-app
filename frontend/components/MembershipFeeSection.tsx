import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { useToast } from '@components/ui/use-toast';
import { Member } from '@shared/types/member';
import axios from 'axios';

interface MembershipFeeSectionProps {
  member: Member;
  isEditing: boolean;
  isFeeCurrent: boolean;
  onUpdate: (member: Member) => void;
  userRole: string | undefined;
}

const MembershipFeeSection: React.FC<MembershipFeeSectionProps> = ({
  member,
  isEditing,
  isFeeCurrent,
  onUpdate,
  userRole
}) => {
  const { toast } = useToast();
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validatePaymentDate = (date: string): boolean => {
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate > today) {
      setPaymentError('Payment date cannot be in the future');
      return false;
    }

    const isLateYearPayment = selectedDate.getMonth() >= 9;
    if (isLateYearPayment) {
      setPaymentDate(prev => {
        const nextYear = new Date(prev);
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        return nextYear.toISOString().split('T')[0];
      });
    }

    setPaymentError(null);
    return true;
  };

  const handleFeePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
  
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
  
      const response = await axios.post(
        `/api/members/${member.member_id}/membership`,
        { paymentDate: paymentDate },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
  
      toast({
        title: "Success",
        description: "Membership fee payment processed successfully",
        variant: "success"
      });
  
      setPaymentDate('');
      setShowPaymentConfirm(false);
      setPaymentError(null);
  
      if (onUpdate && response.data) {
        onUpdate(response.data);
      }
  
    } catch (error) {
      console.error("Error updating membership:", error);
      toast({
        title: "Error",
        description: "Failed to process membership fee payment",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Membership Fee Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {member.membership_details?.fee_payment_date && (
            <>
              <div>
                <span className="text-sm text-gray-500">Last Payment Date:</span>
                <p>{new Date(member.membership_details.fee_payment_date).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Status:</span>
                <span className={`px-2 py-1 rounded-full text-sm ${
                  isFeeCurrent ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {isFeeCurrent ? 'Current' : 'Payment Required'}
                </span>
              </div>
            </>
          )}

          {isEditing && (userRole === 'admin' || userRole === 'superuser') && (
            <form onSubmit={handleFeePayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Payment Date
                </label>
                <input
                  type="date"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  value={paymentDate}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    if (validatePaymentDate(newDate)) {
                      setPaymentDate(newDate);
                    }
                  }}
                  required
                  max={new Date().toISOString().split('T')[0]}
                />
                {paymentError && (
                  <p className="mt-1 text-sm text-red-600">
                    {paymentError}
                  </p>
                )}
                {new Date(paymentDate).getMonth() >= 9 && (
                  <p className="mt-1 text-sm text-blue-600">
                    Payment will be counted for next year's membership
                  </p>
                )}
              </div>

              {!showPaymentConfirm ? (
                <Button
                  type="button"
                  onClick={() => setShowPaymentConfirm(true)}
                  disabled={isSubmitting || !paymentDate}
                  variant="default"
                  className="w-full"
                >
                  Process Payment
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    Confirm payment for {member.first_name} {member.last_name}?
                  </p>
                  <div className="flex space-x-2">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      variant="default"
                      className="flex-1"
                    >
                      {isSubmitting ? "Processing..." : "Confirm"}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setShowPaymentConfirm(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MembershipFeeSection;