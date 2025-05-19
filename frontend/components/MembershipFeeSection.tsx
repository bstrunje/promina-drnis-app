import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { useToast } from '@components/ui/use-toast';
import { Member } from '@shared/member';
import { cn } from '@/lib/utils';
import { formatDate } from '../src/utils/dateUtils';
import { Input } from '@components/ui/input';
import { format, parseISO, getMonth, isValid as isValidDate } from 'date-fns';
import { getCurrentDate } from '../src/utils/dateUtils';
import { 
  ChevronRight, 
  ChevronDown, 
  Receipt, 
  Clock, 
  Edit, 
  Save, 
  X 
} from 'lucide-react';

import { useAuth } from '../src/context/AuthContext';
// Zamijenjeno: koristi novi adapter iz modularnog membership feature-a
import MembershipCardManagerAdapter from '../src/features/membership/MembershipCardManagerAdapter';
// Ako koristiš MembershipCardManager u JSX-u, zamijeni ga s MembershipCardManagerAdapter
import { updateMembership } from '../src/utils/api';
import { 
  getCurrentYear, 
  hasPaidMembershipFee,
  translateEndReason, 
  determineFeeStatus,
  adaptMembershipPeriods,
  determineDetailedMembershipStatus} from '@shared/memberStatus.types';
import { MembershipPeriod, MembershipEndReason } from '@shared/membership';
import { feeStatusLabels, feeStatusColors } from "@shared/helpers/membershipDisplay"; // Centralizirane labele i boje

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface MembershipFeeSectionProps {
  member: Member;
  isEditing: boolean;
  isFeeCurrent: boolean;
  onUpdate: (member: Member) => void;
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
    isFeeCurrent?: boolean;
    hideTitle?: boolean;
  };
}

// Definiramo tip koji sjedinjuje različite definicije perioda članstva
type UnifiedMembershipPeriod = MembershipPeriod & {
  end_reason?: MembershipEndReason | null;
};

const MembershipFeeSection: React.FC<MembershipFeeSectionProps> = ({
  member,
  isEditing,
  isFeeCurrent: initialIsFeeCurrent,
  onUpdate,

  membershipHistory,
  memberId,
  onMembershipHistoryUpdate,
  cardManagerProps
}) => {
  // DEBUG: logiraj cijelog membera i membership_details
  console.log('DEBUG: member', member);
  console.log('DEBUG: membership_details', member?.membership_details);
  const { toast } = useToast();
  const { user } = useAuth();
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidPayment, setIsValidPayment] = useState(false);
  const [isNovemberDecemberPayment, setIsNovemberDecemberPayment] = useState(false);
  const [isNewMemberPayment, setIsNewMemberPayment] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Provjerava je li članarina plaćena za tekuću godinu
  // Ako je plaćena za sljedeću godinu, također se smatra aktivnom
  const [isFeeCurrent, setIsFeeCurrent] = useState(initialIsFeeCurrent);

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
    // Koristi novu funkciju determineFeeStatus za određivanje statusa plaćanja
    const feeStatus = determineFeeStatus(member);
    console.log('DEBUG: feeStatus iz determineFeeStatus:', feeStatus);
    console.log('DEBUG: membership_details u useEffect:', member?.membership_details);
    setIsFeeCurrent(feeStatus === 'current');
  }, [member]);

  const validatePaymentDate = useCallback((dateString: string): boolean => {
    if (!dateString) {
      setPaymentError("Date is required");
      setIsValidPayment(false);
      return false;
    }

    try {
      // Provjeravamo je li unesen kompletan datum (YYYY-MM-DD) a ne samo dio
      if (!DATE_PATTERN.test(dateString)) {
        setIsValidPayment(false);
        return false;
      }

      const date = parseISO(dateString);

      if (!isValidDate(date)) {
        setPaymentError("Invalid date format");
        setIsValidPayment(false);
        return false;
      }

      // DODANO: Validacija godine
      const year = date.getFullYear();
      if (year < 1850 || year > 2850) {
        setPaymentError("Godina mora biti između 1850 i 2850");
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
      
      // Provjeri je li mjesec studeni ili prosinac
      if (month === 10 || month === 11) {
        const currentYear = getCurrentYear();
        const existingYear = member?.membership_details?.fee_payment_year;
        const isNewMember = !(existingYear && existingYear >= currentYear);
        
        // Postavi state za prikazivanje poruke u komponenti
        setIsNovemberDecemberPayment(true);
        setIsNewMemberPayment(isNewMember);
        
        // Prikaži odgovarajuću toast poruku o plaćanju u studenom/prosincu
        if (isNewMember) {
          toast({
            title: "Info",
            description: "Za nove članove, članarina plaćena u studenom/prosincu vrijedi za tekuću godinu.",
            variant: "default"
          });
        } else {
          toast({
            title: "Info",
            description: "Članarina plaćena u studenom/prosincu bit će uračunata za sljedeću godinu.",
            variant: "default"
          });
        }
      } else {
        setIsNovemberDecemberPayment(false);
        setIsNewMemberPayment(false);
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
  }, [member, setPaymentError, setIsValidPayment, setIsNovemberDecemberPayment, setIsNewMemberPayment, toast]);

  useEffect(() => {
    // Only validate when full date is entered
    if (DATE_PATTERN.test(paymentDate)) {
      validatePaymentDate(paymentDate);
    }
  }, [paymentDate, validatePaymentDate]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    setPaymentDate(value);

    // Resetiraj stanja za nepotpuni ili nevalidan datum
    if (!DATE_PATTERN.test(value) || !isValidDate(parseISO(value))) {
      setPaymentError(null);
      setIsValidPayment(false);
      return;
    }
    // Tek sad validiraj
    validatePaymentDate(value);
  };

  const handleProcessPaymentClick = (): void => {
    // Resetiramo stanje prikaza poruke za studeni/prosinac
    setIsNovemberDecemberPayment(false);
    setIsNewMemberPayment(false);
    
    setShowPaymentConfirm(true);
  };

  const handleFeePayment = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Resetiramo stanje prikaza poruke za studeni/prosinac
    setIsNovemberDecemberPayment(false);
    setIsNewMemberPayment(false);
    
    try {
      const parsedDate = parseISO(paymentDate);
      parsedDate.setHours(12, 0, 0, 0); // Standardize to noon UTC

      const currentYear = new Date().getFullYear();
      const paymentMonth = getMonth(parsedDate);
      
      // Determine if this is a renewal payment in November/December
      // for a member who already has paid for the current year
      const isRenewalPayment = 
        isFeeCurrent && // Already has current payment
        (paymentMonth === 10 || paymentMonth === 11) && // 10=Nov, 11=Dec in JS Date
        member?.membership_details?.fee_payment_year === currentYear; // Paid for current year
      
      // Obavijesti korisnika o tome kako će se tretirati plaćanje u studenom/prosincu
      if (paymentMonth === 10 || paymentMonth === 11) { // 10=Nov, 11=Dec
        const existingYear = member?.membership_details?.fee_payment_year;
        const isNewMember = !(existingYear && existingYear >= currentYear);
        
        if (!isNewMember) {
          toast({
            title: "Info",
            description: "Payment will be counted for next year's membership",
            variant: "default"
          });
        } else {
          toast({
            title: "Info",
            description: "For new members, payment is counted for current year membership",
            variant: "default"
          });
        }
      }

      // Pozivamo API za ažuriranje članarine bez pohranjivanja odgovora
      await updateMembership(member.member_id, {
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

      // ApiMembershipUpdateResult nema member property, pa ručno ažuriramo lokalnog člana
      if (onUpdate) {
        const updatedMember: Member = {
          ...member,
          membership_details: {
            ...(member?.membership_details ?? {}),
            fee_payment_date: parsedDate.toISOString(),
            fee_payment_year: isRenewalPayment ? currentYear + 1 : currentYear
          }
        };
        onUpdate(updatedMember);
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
  const handleHistorySave = async (): Promise<void> => {
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
    } catch {
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
  const handlePeriodChange = (index: number, field: keyof UnifiedMembershipPeriod, value: string | number | null) => {
    const updatedPeriods = [...editedPeriods];
    updatedPeriods[index] = {
      ...updatedPeriods[index],
      [field]: value
    };
    setEditedPeriods(updatedPeriods);
  };

  // Add new period
  const handleAddPeriod = (): void => {
    if (!newPeriod?.start_date) return;

    const period: UnifiedMembershipPeriod = {
      period_id: Date.now(), // Koristimo period_id umjesto id (privremeni ID)
      member_id: memberId ?? 0,
      start_date: newPeriod.start_date,
      end_date: newPeriod.end_date,
      end_reason: newPeriod.end_reason
    };

    setEditedPeriods([...editedPeriods, period]);
    setNewPeriod(null);
  };

  // Delete period
  const handleDeletePeriod = (index: number): void => {
    const updatedPeriods = [...editedPeriods];
    updatedPeriods.splice(index, 1);
    setEditedPeriods(updatedPeriods);
  };

  return (
    <div>
      {/* Membership Status Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 mr-2" />
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
                  {member.membership_details?.fee_payment_date
                    ? formatDate(member.membership_details.fee_payment_date, 'dd.MM.yyyy.')
                    : 'Nema podataka o plaćanju za tekuću ili iduću godinu'}
                  </p>
                </div>
              )}
              
              {member.membership_details?.fee_payment_year && (
                <div className="mb-3">
                  <span className="text-sm text-gray-500">Godina uplate:</span>
                  <p>{member.membership_details.fee_payment_year}</p>
                </div>
              )}
              
              <div className="mb-3">
                <span className="text-sm text-gray-500">Status uplate:</span>
                {(() => {
                  const feeStatus = determineFeeStatus(member);
                  console.log('DEBUG: fee_payment_date:', member.membership_details?.fee_payment_date);
                  console.log('DEBUG: fee_payment_year:', member.membership_details?.fee_payment_year);
                  console.log('DEBUG: determineFeeStatus:', feeStatus);
                  return (
                <span
                  className={`ml-2 px-2 py-1 rounded-full text-sm font-medium ${feeStatusColors[isFeeCurrent ? 'current' : 'payment required']}`}
                >
                  {feeStatusLabels[isFeeCurrent ? 'current' : 'payment required']}
                </span>
                  );
                })()}

                {member.membership_details?.fee_payment_year && (
                  <p className="text-xs text-gray-500 mt-1">
                    Paid for year: {member.membership_details.fee_payment_year}
                  </p>
                )}
              </div>
              
              {/* Prikaz statusa članstva (active/inactive) */}
              {/* Uvijek prikazujemo status članstva */}
              {(() => {
                // Koristi nove funkcije za određivanje statusa
                const hasPaidFee = hasPaidMembershipFee(member);
                
                // Potrebna je tipski sigurna provjera za "active" status koji dolazi iz baze
                const memberStatus = member.status as string; // Eksplicitno tretiramo kao string za provjeru
                const isRegisteredOrActive = memberStatus === 'registered' || memberStatus === 'active';
                
                // Određivanje statusa članstva prema prioritetima
                const detailedMembershipStatus = membershipHistory?.periods 
                  ? determineDetailedMembershipStatus(member, adaptMembershipPeriods(membershipHistory.periods))
                  : {
                      // Ako je član već registriran u bazi ili ima "active" status iz membership_details, 
                      // tretiramo ga kao registriranog člana čak i ako još nema plaćenu članarinu
                      status: isRegisteredOrActive ? 'registered' : (hasPaidFee ? 'registered' : (member.status ?? 'pending')),
                      reason: isRegisteredOrActive ? 'Registrirani član' : (hasPaidFee ? 'Aktivan član s plaćenom članarinom' : 'Status na čekanju'),
                      date: null,
                      endReason: null
                    };
                
                // Za kompatibilnost s postojećim kodom
                const membershipStatus = detailedMembershipStatus.status;
                 
                // Aktivan član ima plaćenu članarinu i ima aktivan period
                
                
                return (
                  <div className="mb-4">
                    <h3 className="text-sm text-gray-500 mb-1">Member Status:</h3>
                    <div className="flex items-center">
                      <span 
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium ${
                          membershipStatus === 'registered' 
                            ? 'bg-green-100 text-green-800' 
                            : membershipStatus === 'inactive' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {membershipStatus === 'registered' ? 'Članstvo važeće' : membershipStatus === 'inactive' ? 'Neaktivan' : 'Na čekanju'}
                      </span>
                    </div>
                    
                    {/* Prikazujemo detalje statusa članstva samo ako nisu dupliranje glavnog statusa */}
                    {detailedMembershipStatus.reason && 
                     membershipStatus !== 'registered' && 
                     !(membershipStatus === 'inactive' && ['Isključen iz članstva', 'Smrt člana', 'Dobrovoljno povlačenje'].includes(detailedMembershipStatus.reason)) && (
                      <p className="text-sm text-gray-700 mt-1">
                        {detailedMembershipStatus.reason}
                      </p>
                    )}
                    
                    {/* Prikaži datum završetka i razlog ako postoji */}
                    {detailedMembershipStatus.date && detailedMembershipStatus.status === 'inactive' && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          End date: {new Date(detailedMembershipStatus.date).toLocaleDateString('hr-HR')}
                        </p>
                        {detailedMembershipStatus.endReason && (
                          <p className="text-sm text-gray-500">
                            Reason: {translateEndReason(detailedMembershipStatus.endReason)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Membership Card Management - visible only if fee is current */}
            {isEditing && cardManagerProps && (
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-3">Membership Card Management</h3>
                <MembershipCardManagerAdapter {...cardManagerProps} />
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
                <form onSubmit={(e) => { void handleFeePayment(e); } }>
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
                          onChange={handleDateChange}
                          className={`${paymentError ? 'border-red-300' : ''}`}
                          required
                        />
                      </div>
                      {paymentError && (
                        <p className="mt-1 text-sm text-red-600">{paymentError}</p>
                      )}
                    </div>

                    {/* Poruka se prikazuje isključivo kad je datum kompletan i validan */}
                    {isValidPayment && isNovemberDecemberPayment && (
                      <div className={`mt-4 p-4 rounded-md text-center text-lg font-medium ${
                        isNewMemberPayment 
                          ? 'bg-blue-600 text-white'
                          : 'bg-amber-600 text-white'
                      }`}>
                        {isNewMemberPayment
                          ? "Za nove članove, članarina plaćena u studenom/prosincu vrijedi za tekuću godinu."
                          : "Članarina plaćena u studenom/prosincu bit će uračunata za sljedeću godinu."}
                      </div>
                    )}

                    {!showPaymentConfirm ? (
                      <Button
                        type="button"
                        onClick={() => { void handleProcessPaymentClick(); } }
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
              <Clock className="w-5 h-5 mr-2" />
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
                        onClick={() => { void handleHistorySave(); } }
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
                          setEditedPeriods(membershipHistory?.periods ?? []);
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
                          <div key={period.period_id ?? index} className="p-3 border rounded-md bg-gray-50">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-gray-500">Start Date</label>
                                <Input
                                  type="date"
                                  value={period.start_date?.toString().split('T')[0] ?? ''}
                                  onChange={(e) => handlePeriodChange(index, 'start_date', e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500">End Date</label>
                                <Input
                                  type="date"
                                  value={period.end_date?.toString().split('T')[0] ?? ''}
                                  onChange={(e) => handlePeriodChange(index, 'end_date', e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500">End Reason</label>
                                <select
                                  className="w-full p-2 border rounded"
                                  value={period.end_reason ?? ''}
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
                                value={newPeriod?.start_date?.toString().split('T')[0] ?? ''}
                                onChange={(e) => setNewPeriod({ ...(newPeriod ?? {}), start_date: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500">End Date</label>
                              <Input
                                type="date"
                                value={newPeriod?.end_date?.toString().split('T')[0] ?? ''}
                                onChange={(e) => setNewPeriod({ ...(newPeriod ?? {}), end_date: e.target.value })}
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="text-xs text-gray-500">End Reason</label>
                              <select
                                className="w-full p-2 border rounded"
                                value={newPeriod?.end_reason ?? ""}
                                onChange={(e) => setNewPeriod({ ...(newPeriod ?? {}), end_reason: e.target.value as MembershipEndReason })}
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
                          <div key={period.period_id ?? index} className="p-3 border rounded-md bg-gray-50">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <p className="text-xs text-gray-500">Start Date</p>
                                <p>{format(new Date(period.start_date), 'dd.MM.yyyy')}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">End Date</p>
                                <p>{period.end_date ? format(new Date(period.end_date), 'dd.MM.yyyy') : ''}</p>
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