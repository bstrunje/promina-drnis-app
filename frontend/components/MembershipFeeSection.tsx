import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { useToast } from '@components/ui/use-toast';
import { Member } from '@shared/member';
import { cn } from '@/lib/utils';
import { format, isFuture, isValid as isValidDate, parseISO } from 'date-fns';
import { SystemSettings } from '@shared/settings.types';
import { updateMembership } from '../src/utils/api'; // Use API client instead of direct axios
import { getCurrentYear, getCurrentDate, formatInputDate, getMonth } from '../src/utils/dateUtils';
import { ChevronDown, ChevronRight, Calendar, Edit, Save, X } from 'lucide-react';
import { MembershipPeriod, MembershipEndReason } from '@shared/membership';
import { API_BASE_URL } from '@/utils/config';
import { useAuth } from "../src/context/AuthContext";
import { Input } from "@components/ui/input";
import MembershipCardManager from './MembershipCardManager';

interface MembershipFeeSectionProps {
  member: Member;
  isEditing: boolean;
  isFeeCurrent: boolean;
  onUpdate: (member: Member) => void;
  userRole: string | undefined;
  membershipHistory?: {
    periods: MembershipPeriod[];
    totalDuration?: string;
    currentPeriod?: MembershipPeriod;
  };
  memberId?: number;
  onMembershipHistoryUpdate?: (periods: MembershipPeriod[]) => Promise<void>;
  cardManagerProps?: {
    member: Member;
    onUpdate: (member: Member) => Promise<void>;
    userRole?: string;
    isFeeCurrent?: boolean;
    hideTitle?: boolean;
  };
}

const MembershipFeeSection: React.FC<MembershipFeeSectionProps> = ({
  member,
  isEditing,
  isFeeCurrent,
  onUpdate,
  userRole,
  membershipHistory,
  memberId,
  onMembershipHistoryUpdate,
  cardManagerProps
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidPayment, setIsValidPayment] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // States for membership history editing
  const [isEditingHistory, setIsEditingHistory] = useState(false);
  const [editedPeriods, setEditedPeriods] = useState<MembershipPeriod[]>([]);
  const [isSubmittingHistory, setIsSubmittingHistory] = useState(false);
  const [newPeriod, setNewPeriod] = useState<Partial<MembershipPeriod> | null>(null);

  const hasAdminPrivileges = user?.role === "admin" || user?.role === "superuser";
  const canEdit = hasAdminPrivileges;

  useEffect(() => {
    if (membershipHistory?.periods) {
      setEditedPeriods(membershipHistory.periods);
    }
  }, [membershipHistory]);

  useEffect(() => {
    if (member?.membership_details) {
      // Uklonjen sav debugging kod
      // Popravak dupliranih if uvjeta
    }
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

      // Koristimo getCurrentDate umjesto direktnog uspoređivanja s isFuture
      // kako bismo podržali simulirani datum
      const currentDate = getCurrentDate();
      if (date > currentDate) {
        setPaymentError("Payment date cannot be in the future");
        setIsValidPayment(false);
        return false;
      }

      const month = getMonth(date); // JavaScript months: 0=Jan, 1=Feb, ..., 10=Nov, 11=Dec

      if (month === 10 || month === 11) { // 10=November, 11=December in JS Date
        // Provjeri je li ovo novi član (check postoji li fee_payment_date)
        const isNewMember = !member.membership_details?.fee_payment_date;

        // Prikaži poruku samo za postojeće članove
        if (!isNewMember) {
          toast({
            title: "Info",
            description: "Payment will be counted for next year's membership",
            variant: "default"
          });
        } else {
          // Za nove članove prikazujemo drugačiju poruku
          toast({
            title: "Info",
            description: "For new members, payment is counted for current year membership",
            variant: "default"
          });
        }
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

      const currentYear = getCurrentYear();
      const paymentMonth = getMonth(parsedDate);

      const isRenewalPayment =
        isFeeCurrent && // Already has current payment
        (paymentMonth === 10 || paymentMonth === 11) && // 10=Nov, 11=Dec in JS Date
        member?.membership_details?.fee_payment_year === currentYear; // Paid for current year

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
        onUpdate(response.member);

        const paymentYear = isRenewalPayment ? currentYear + 1 : currentYear;
        const locallyUpdatedMember = {
          ...member,
          membership_details: {
            ...(member.membership_details || {}),
            fee_payment_date: parsedDate.toISOString(),
            fee_payment_year: paymentYear
          }
        };

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

  // Handle save for membership history
  const handleHistorySave = async () => {
    if (!onMembershipHistoryUpdate) return;

    setIsSubmittingHistory(true);
    try {
      await onMembershipHistoryUpdate(editedPeriods);
      setIsEditingHistory(false);
      toast({
        title: "Success",
        description: "Membership history updated successfully",
        variant: "success"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update membership history",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingHistory(false);
    }
  };

  // Handle edit for a specific period
  const handlePeriodChange = (index: number, field: keyof MembershipPeriod, value: any) => {
    const updatedPeriods = [...editedPeriods];
    updatedPeriods[index] = {
      ...updatedPeriods[index],
      [field]: value
    };
    setEditedPeriods(updatedPeriods);
  };

  // Add new period
  const handleAddPeriod = () => {
    if (!newPeriod?.start_date) return;

    const period: MembershipPeriod = {
      period_id: Date.now(), // Koristimo period_id umjesto id (privremeni ID)
      member_id: memberId || 0,
      start_date: newPeriod.start_date,
      end_date: newPeriod.end_date,
      end_reason: newPeriod.end_reason as MembershipEndReason
    };

    setEditedPeriods([...editedPeriods, period]);
    setNewPeriod(null);
  };

  // Delete period
  const handleDeletePeriod = (index: number) => {
    const updatedPeriods = [...editedPeriods];
    updatedPeriods.splice(index, 1);
    setEditedPeriods(updatedPeriods);
  };

  const translateEndReason = (reason: MembershipEndReason): string => {
    switch (reason) {
      case 'withdrawal':
        return 'Istupanje';
      case 'non_payment':
        return 'Neplaćanje članarine';
      case 'expulsion':
        return 'Isključenje';
      case 'death':
        return 'Smrt';
      default:
        return 'Nepoznat razlog';
    }
  };

  return (
    <div>
      {/* Membership Status Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Membership Fee Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Status Display */}
          <div className="space-y-6">
            {/* Display Fee Payment Information */}
            <div>
              {member.membership_details?.fee_payment_date && (
                <div className="mb-3">
                  <span className="text-sm text-gray-500">Last Payment Date:</span>
                  <p>
                    {format(parseISO(member.membership_details.fee_payment_date), 'dd.MM.yyyy')}
                  </p>
                </div>
              )}
              
              {(member.membership_details?.fee_payment_year || member.fee_payment_year) && (
                <div className="mb-3">
                  <span className="text-sm text-gray-500">Payment Year:</span>
                  <p>{member.membership_details?.fee_payment_year || member.fee_payment_year}</p>
                </div>
              )}
              
              <div className="mb-3">
                <span className="text-sm text-gray-500">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-sm ${isFeeCurrent ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {isFeeCurrent ? 'Current' : 'Payment Required'}
                </span>
                {member.membership_details?.fee_payment_year && (
                  <p className="text-xs text-gray-500 mt-1">
                    Paid for year: {member.membership_details.fee_payment_year}
                  </p>
                )}
              </div>
              
              {/* Prikaz statusa članstva (active/inactive) */}
              {member.status && (
                <div className="mb-3">
                  <span className="text-sm text-gray-500">Member Status:</span>
                  <span className={`ml-2 px-2 py-1 rounded-full text-sm ${
                    member.status === 'registered' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {member.status === 'registered' ? 'Active' : 'Inactive'}
                  </span>
                  
                  {member.status === 'inactive' && membershipHistory?.periods && membershipHistory.periods.length > 0 && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded">
                      <p className="text-red-700 font-medium">Membership Ended</p>
                      {(() => {
                        // Pronađi zadnji period koji ima end_date i end_reason
                        const lastEndedPeriod = [...membershipHistory.periods]
                          .sort((a, b) => new Date(b.end_date || '').getTime() - new Date(a.end_date || '').getTime())
                          .find(p => p.end_date && p.end_reason);
                          
                        if (lastEndedPeriod) {
                          return (
                            <>
                              <p className="text-sm text-red-600">
                                End date: {format(parseISO(lastEndedPeriod.end_date!), 'dd.MM.yyyy')}
                              </p>
                              <p className="text-sm text-red-600">
                                Reason: {translateEndReason(lastEndedPeriod.end_reason!)}
                              </p>
                            </>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Membership Card Management - visible only if fee is current */}
            {isEditing && cardManagerProps && (
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-3">Membership Card Management</h3>
                <MembershipCardManager {...cardManagerProps} />
              </div>
            )}
            
            {isEditing && !isFeeCurrent && cardManagerProps && (
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-3 text-amber-700">Membership Card Management</h3>
                <div className="text-amber-600 p-3 bg-amber-50 rounded-md">
                  <p>Upravljanje članskom karticom bit će dostupno nakon plaćanja godišnje članarine.</p>
                </div>
              </div>
            )}

            {/* Payment Form - visible only for admins */}
            {canEdit && isEditing && (
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-3">Process Payment</h3>
                <form onSubmit={handleFeePayment}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700">
                        Payment Date
                      </label>
                      <div className="mt-1 relative">
                        <Input
                          type="date"
                          id="paymentDate"
                          value={paymentDate}
                          onChange={(e) => {
                            setPaymentDate(e.target.value);
                            validatePaymentDate(e.target.value);
                          }}
                          className={`${paymentError ? 'border-red-300' : ''}`}
                          required
                        />
                      </div>
                      {paymentError && (
                        <p className="mt-1 text-sm text-red-600">{paymentError}</p>
                      )}
                    </div>

                    {!showPaymentConfirm ? (
                      <Button
                        type="button"
                        onClick={() => setShowPaymentConfirm(true)}
                        disabled={!isValidPayment || isSubmitting}
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
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Membership History Section - Collapsible */}
          <div className="mt-8 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center text-lg font-medium text-gray-900 hover:text-blue-600 focus:outline-none"
            >
              {showHistory ? (
                <ChevronDown className="w-5 h-5 mr-2" />
              ) : (
                <ChevronRight className="w-5 h-5 mr-2" />
              )}
              Membership History
            </button>

            {showHistory && (
              <div className="mt-4 space-y-4">
                {/* Display membership history */}
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-medium">Membership Periods</h4>
                  {canEdit && !isEditingHistory && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditingHistory(true)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit History
                    </Button>
                  )}
                  {canEdit && isEditingHistory && (
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={handleHistorySave}
                        disabled={isSubmittingHistory}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsEditingHistory(false);
                          setEditedPeriods(membershipHistory?.periods || []);
                        }}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>

                {membershipHistory?.periods && membershipHistory.periods.length > 0 ? (
                  <div>
                    {isEditingHistory ? (
                      <div className="space-y-4">
                        {/* Editing interface */}
                        {editedPeriods.map((period, index) => (
                          <div key={period.period_id || index} className="p-3 border rounded-md bg-gray-50">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-gray-500">Start Date</label>
                                <Input
                                  type="date"
                                  value={period.start_date ? period.start_date.toString().split('T')[0] : ''}
                                  onChange={(e) => handlePeriodChange(index, 'start_date', e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500">End Date</label>
                                <Input
                                  type="date"
                                  value={period.end_date ? period.end_date.toString().split('T')[0] : ''}
                                  onChange={(e) => handlePeriodChange(index, 'end_date', e.target.value)}
                                />
                              </div>
                              <div className="col-span-2">
                                <label className="text-xs text-gray-500">End Reason</label>
                                <select
                                  className="w-full p-2 border rounded"
                                  value={period.end_reason || ""}
                                  onChange={(e) => handlePeriodChange(index, "end_reason", e.target.value as MembershipEndReason)}
                                >
                                  <option value="">Odaberite razlog</option>
                                  <option value="withdrawal">Istupanje</option>
                                  <option value="non_payment">Neplaćanje članarine</option>
                                  <option value="expulsion">Isključenje</option>
                                  <option value="death">Smrt</option>
                                </select>
                              </div>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeletePeriod(index)}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        ))}

                        {/* Add new period */}
                        <div className="p-3 border rounded-md bg-gray-50 border-dashed">
                          <h5 className="text-sm font-medium mb-2">Add New Period</h5>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-gray-500">Start Date</label>
                              <Input
                                type="date"
                                value={newPeriod?.start_date?.toString().split('T')[0] || ''}
                                onChange={(e) => setNewPeriod({ ...newPeriod || {}, start_date: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500">End Date</label>
                              <Input
                                type="date"
                                value={newPeriod?.end_date?.toString().split('T')[0] || ''}
                                onChange={(e) => setNewPeriod({ ...newPeriod || {}, end_date: e.target.value })}
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="text-xs text-gray-500">End Reason</label>
                              <select
                                className="w-full p-2 border rounded"
                                value={newPeriod?.end_reason || ""}
                                onChange={(e) => setNewPeriod({ ...newPeriod || {}, end_reason: e.target.value as MembershipEndReason })}
                              >
                                <option value="">Odaberite razlog</option>
                                <option value="withdrawal">Istupanje</option>
                                <option value="non_payment">Neplaćanje članarine</option>
                                <option value="expulsion">Isključenje</option>
                                <option value="death">Smrt</option>
                              </select>
                            </div>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={handleAddPeriod}
                              disabled={!newPeriod?.start_date}
                            >
                              Add Period
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* View only interface */}
                        {membershipHistory.periods.map((period, index) => (
                          <div key={period.period_id || index} className="p-3 border rounded-md bg-gray-50">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <p className="text-xs text-gray-500">Start Date</p>
                                <p>{format(new Date(period.start_date), 'dd.MM.yyyy')}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">End Date</p>
                                <p>{period.end_date ? format(new Date(period.end_date), 'dd.MM.yyyy') : 'Active'}</p>
                              </div>
                              {period.end_reason && (
                                <div className="col-span-2">
                                  <p className="text-xs text-gray-500">End Reason</p>
                                  <p>{translateEndReason(period.end_reason)}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No membership history available</p>
                )}

                {membershipHistory?.totalDuration && (
                  <div>
                    <p className="text-sm text-gray-500">Total Membership Duration</p>
                    <p className="font-medium">{membershipHistory.totalDuration}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MembershipFeeSection;