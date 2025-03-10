import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { useToast } from '@components/ui/use-toast';
import { Member } from '@shared/member';
import { cn } from '@/lib/utils';
import { format, isFuture, isValid as isValidDate, parseISO } from 'date-fns';
import { SystemSettings } from '@shared/settings.types';
import { updateMembership } from '../src/utils/api'; // Use API client instead of direct axios

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
  const [isValidPayment, setIsValidPayment] = useState(false);
  
  // Debug data on mount with proper type checking
  useEffect(() => {
    console.log("Member object structure:", JSON.stringify(member, null, 2));
    console.log("Membership details structure:", member?.membership_details ? 
      JSON.stringify(member.membership_details, null, 2) : "undefined");
      
    // Check if data is available in membership_details
    if (member?.membership_details) {
      console.log("Fee payment date:", member.membership_details.fee_payment_date);
      console.log("Fee payment year:", member.membership_details.fee_payment_year);
    }
    
    // Also check legacy property
    console.log("Legacy fee payment year:", member?.fee_payment_year);
  }, [member]);

  const validatePaymentDate = async (dateString: string): Promise<boolean> => {
    if (!dateString) {
      setPaymentError("Date is required");
      setIsValidPayment(false);
      return false;
    }
  
    try {
      const date = parseISO(dateString);
      
      if (!isValidDate(date)) {
        setPaymentError("Invalid date format");
        setIsValidPayment(false);
        return false;
      }
  
      if (isFuture(date)) {
        setPaymentError("Payment date cannot be in the future");
        setIsValidPayment(false);
        return false;
      }
  
      // Check if date is in renewal period (November/December)
      const month = date.getMonth(); // JavaScript months: 0=Jan, 1=Feb, ..., 10=Nov, 11=Dec
      
      // Add informative message for renewal period
      if (month === 10 || month === 11) { // 10=November, 11=December in JS Date
        toast({
          title: "Info",
          description: "This payment will be counted for next year's membership",
          variant: "default"
        });
      }
  
      setPaymentError(null);
      setIsValidPayment(true);
      return true;
  
    } catch (error) {
      console.error("Error validating date:", error);
      setPaymentError("Failed to validate payment date");
      setIsValidPayment(false);
      return false;
    }
  };

  useEffect(() => {
    if (paymentDate) {
      validatePaymentDate(paymentDate);
    }
  }, [paymentDate]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPaymentDate(value);
    validatePaymentDate(value);
  };

  const handleFeePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
  
    try {
      const parsedDate = parseISO(paymentDate);
      parsedDate.setHours(12, 0, 0, 0); // Standardize to noon UTC
      
      const currentYear = new Date().getFullYear();
      const paymentMonth = parsedDate.getMonth();
      
      // Determine if this is a renewal payment in November/December
      // for a member who already has paid for the current year
      const isRenewalPayment = 
        isFeeCurrent && // Already has current payment
        (paymentMonth === 10 || paymentMonth === 11) && // 10=Nov, 11=Dec in JS Date
        member?.membership_details?.fee_payment_year === currentYear; // Paid for current year
  
      console.log("Payment context:", {
        paymentDate: parsedDate.toISOString(),
        paymentMonth,
        currentYear,
        memberFeeYear: member?.membership_details?.fee_payment_year,
        isFeeCurrent,
        isRenewalPayment
      });
  
      // Use the API client function instead of direct axios call
      const response = await updateMembership(member.member_id, {
        paymentDate: parsedDate.toISOString(),
        isRenewalPayment
      });
  
      toast({
        title: "Success",
        description: "Membership fee payment processed successfully",
        variant: "success"
      });
  
      setPaymentDate('');
      setShowPaymentConfirm(false);
      setPaymentError(null);
  
      if (onUpdate && response && response.member) {
        // Make sure to use the updated member data from the response
        onUpdate(response.member);
        
        // Update local UI state immediately to reflect the payment
        // This will show updated status without needing a full page refresh
        const paymentYear = isRenewalPayment ? currentYear + 1 : currentYear;
        const locallyUpdatedMember = {
          ...member,
          membership_details: {
            ...(member.membership_details || {}),
            fee_payment_date: parsedDate.toISOString(),
            fee_payment_year: paymentYear
          }
        };
        
        // Force re-render with updated data
        onUpdate(locallyUpdatedMember);
      }
  
    } catch (error) {
      console.error("Error updating membership:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process membership fee payment",
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
          {member.membership_details?.fee_payment_date ? (
            <>
              <div>
                <span className="text-sm text-gray-500">Last Payment Date:</span>
                <p>
                  {format(parseISO(member.membership_details.fee_payment_date), 'dd.MM.yyyy')}
                </p>
              </div>
              {(member.membership_details?.fee_payment_year || member.fee_payment_year) && (
                <div>
                  <span className="text-sm text-gray-500">Payment Year:</span>
                  <p>{member.membership_details?.fee_payment_year || member.fee_payment_year}</p>
                </div>
              )}
              <div>
                <span className="text-sm text-gray-500">Status:</span>
                <span className={`px-2 py-1 rounded-full text-sm ${
                  isFeeCurrent ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {isFeeCurrent ? 'Current' : 'Payment Required'}
                </span>
                {member.membership_details?.fee_payment_year && (
                  <p className="text-xs text-gray-500 mt-1">
                    Paid for year: {member.membership_details.fee_payment_year}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <div>
                <span className="text-sm text-gray-500">Last Payment Date:</span>
                <p>No payment recorded</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Status:</span>
                <span className="px-2 py-1 rounded-full text-sm bg-red-100 text-red-800">
                  Payment Required
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
                  onChange={handleDateChange}
                  required
                  max={format(new Date(), 'yyyy-MM-dd')}
                />
                {paymentError && (
                  <p className="mt-1 text-sm text-red-600">
                    {paymentError}
                  </p>
                )}
                {paymentDate && parseISO(paymentDate).getMonth() >= 10 && (
                  <p className="mt-1 text-sm text-blue-600">
                    Payment will be counted for next year's membership
                  </p>
                )}
              </div>

              {!showPaymentConfirm ? (
                <Button
                  type="button"
                  onClick={() => setShowPaymentConfirm(true)}
                  disabled={!isValidPayment || isSubmitting}
                  variant={isValidPayment ? "default" : "outline"}
                  className={cn(
                    "w-full",
                    isValidPayment ? "bg-black hover:bg-blue-500" : "bg-gray-200",
                    isSubmitting && "opacity-50"
                  )}
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
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                    >
                      {isSubmitting ? "Processing..." : "Confirm"}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setShowPaymentConfirm(false)}
                      variant="outline"
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white"
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