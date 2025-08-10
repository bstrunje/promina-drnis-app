import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { useToast } from '@components/ui/use-toast';
import { Member } from '@shared/member';
import { cn } from '@/lib/utils';
import { formatDate, formatDateToIsoDateString, cleanISODateString } from '../src/utils/dateUtils';
import { Input } from '@components/ui/input';
import { format, parseISO, getMonth, isValid as isValidDate } from 'date-fns';
import { getCurrentDate } from '../src/utils/dateUtils';
import { useTranslation } from 'react-i18next';											   
import { 
  ChevronRight, 
  ChevronDown, 
  Receipt, 
  Clock, 
  Edit, 
  Save, 
  X 
} from 'lucide-react';
import { formatInputDate } from '../src/utils/dateUtils';
import { useAuth } from '../src/context/useAuth';
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
import { feeStatusColors } from "@shared/helpers/membershipDisplay"; // Centralizirane labele i boje

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

const endReasonOptions: MembershipEndReason[] = [
  'withdrawal',
  'non_payment',
  'expulsion',
  'death',
];

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
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation(['profile', 'common']);								 
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

  const hasAdminPrivileges = user?.role === "member_administrator" || user?.role === "member_superuser";
  const canEdit = hasAdminPrivileges;

  useEffect(() => {
    if (membershipHistory?.periods) {
      setEditedPeriods(membershipHistory.periods);
    }
  }, [membershipHistory]);

  useEffect(() => {
    // Koristi novu funkciju determineFeeStatus za određivanje statusa plaćanja
    const feeStatus = determineFeeStatus(member);
    setIsFeeCurrent(feeStatus === 'current');
  }, [member]);

  const validatePaymentDate = useCallback((dateString: string): boolean => {
    if (!dateString) {
      setPaymentError(t('feeSection.paymentDateRequired'));
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
        setPaymentError(t('feeSection.invalidDate'));
        setIsValidPayment(false);
        return false;
      }

      // DODANO: Validacija godine
      const year = date.getFullYear();
      if (year < 1850 || year > 2850) {
        setPaymentError(t('feeSection.invalidYear'));
        setIsValidPayment(false);
        return false;
      }

      // Koristimo getCurrentDate umjesto direktnog uspoređivanja s isFuture
      // kako bismo podržali simulirani datum
      const currentDate = getCurrentDate();
      if (date > currentDate) {
        setPaymentError(t('feeSection.futureDate'));
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
            title: t('common:info'),
            description: t('feeSection.newMemberNovDecPayment'),
            variant: "default"
          });
        } else {
          toast({
            title: t('common:info'),
            description: t('feeSection.novDecPaymentNextYear'),
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
      setPaymentError(t('feeSection.validationError'));
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
            title: t('common:info'),
            description: t('feeSection.novDecPaymentNextYear'),
            variant: "default"
          });
        } else {
          toast({
            title: t('common:info'),
            description: t('feeSection.newMemberNovDecPayment'),
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
        title: t('feeSection.success'),
        description: t('feeSection.paymentProcessed'),
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
            fee_payment_date: formatDateToIsoDateString(parsedDate),
            fee_payment_year: isRenewalPayment ? currentYear + 1 : currentYear
          }
        };
        onUpdate(updatedMember);
      }

    } catch (error) {
      console.error("Error updating membership:", error);
      toast({
        title: t('common:error'),
        description: t('feeSection.paymentError'),
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
        title: t('common:success'),
        description: t('feeSection.historyUpdated'),
        variant: "success"
      });
    } catch {
      toast({
        title: t('common:error'),
        description: t('feeSection.historyUpdateFailed'),
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
            {t('feeSection.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Status Display */}
          <div className="space-y-6">
            {/* Display Fee Payment Information */}
            <div>
              <div className="mb-3">
                <span className="text-sm text-gray-500">{t('feeSection.lastPaymentDate')}</span>
                <p>
                {member.membership_details?.fee_payment_date
                  ? formatDate(cleanISODateString(member.membership_details.fee_payment_date), 'dd.MM.yyyy.')
                  : t('feeSection.noPaymentData')}
                </p>
              </div>
                            
              <div className="mb-3">
                <span className="text-sm text-gray-500">{t('feeSection.paymentStatus')}:</span>
                {(() => {
                  const feeStatus = determineFeeStatus(member);
                  return (
                <span
                  className={`ml-2 px-2 py-1 rounded-full text-sm font-medium ${
                    feeStatusColors[isFeeCurrent ? 'current' : 'payment required']
                  }`}
                >
                  {isFeeCurrent
                    ? t('feeSection.statusCurrent')
                    : t('feeSection.statusPaymentRequired')}
                </span>
                  );
                })()}

                {member.membership_details?.fee_payment_year && (
                  <p className="text-xs text-gray-500 mt-1">
                    {t('feeSection.paidForYear')}: {member.membership_details.fee_payment_year}
                  </p>
                )}
              </div>
              
              {/* Prikaz statusa članstva (active/inactive) */}
              {/* Uvijek prikazujemo status članstva */}
              {(() => {
                const lastPeriod = membershipHistory?.periods?.[membershipHistory.periods.length - 1];

                if (lastPeriod && lastPeriod.end_date && lastPeriod.end_reason) {
                  const today = getCurrentDate();
                  const currentMonth = today.getMonth(); // 0 = Siječanj, 1 = Veljača

                  let statusInfo = {
                    text: t('feeSection.membershipEnded'),
                    className: 'bg-red-100 text-red-800',
                  };

                  if (lastPeriod.end_reason === 'non_payment' && (currentMonth === 0 || currentMonth === 1)) {
                    statusInfo = {
                      text: t('feeSection.membershipExpired'),
                      className: 'bg-yellow-100 text-yellow-800',
                    };
                  }

                  return (
                    <div className="flex items-center mb-4">
                      <span className="text-sm text-gray-500 mr-2">{t('feeSection.memberStatus')}:</span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium ${statusInfo.className}`}>
                        {statusInfo.text}
                      </span>
                    </div>
                  );
                }

                // Fallback na postojeću logiku ako gornji uvjeti nisu zadovoljeni
                const hasPaidFee = hasPaidMembershipFee(member);
                const memberStatus = member.status as string;
                const isRegisteredOrActive = memberStatus === 'registered' || memberStatus === 'active';

                const detailedMembershipStatus = membershipHistory?.periods
                  ? determineDetailedMembershipStatus(member, adaptMembershipPeriods(membershipHistory.periods))
                  : {
                      status: isRegisteredOrActive ? 'registered' : (hasPaidFee ? 'registered' : (member.status ?? 'pending')),
                      reason: isRegisteredOrActive ? 'Registrirani član' : (hasPaidFee ? 'Aktivan član s plaćenom članarinom' : 'Status na čekanju'),
                      date: null,
                      endReason: null,
                    };

                const finalMembershipStatus = detailedMembershipStatus.status;

                const getMembershipDisplay = (status: string) => {
                  if (status === 'registered') {
                    return { text: t('feeSection.validMembership'), className: 'bg-green-100 text-green-800' };
                  } else if (status === 'inactive') {
                    return { text: t('feeSection.inactive'), className: 'bg-red-100 text-red-800' };
                  } else {
                    return { text: t('feeSection.pending'), className: 'bg-yellow-100 text-yellow-800' };
                  }
                };

                const display = getMembershipDisplay(finalMembershipStatus);

                return (
                  <div className="mb-4">
                    <div className="flex items-center">
                      <span className="text-sm text-gray-500 mr-2">{t('feeSection.memberStatus')}:</span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium ${display.className}`}>
                        {display.text}
                      </span>
                    </div>
                    {detailedMembershipStatus.reason &&
                      finalMembershipStatus !== 'registered' &&
                      !(finalMembershipStatus === 'inactive' && [t('history.reasons.expulsion'), t('history.reasons.death'), t('history.reasons.withdrawal')].includes(detailedMembershipStatus.reason)) && (
                        <p className="text-sm text-gray-700 mt-1">
                          {detailedMembershipStatus.reason}
                        </p>
                      )}
                    {detailedMembershipStatus.date && detailedMembershipStatus.status === 'inactive' && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          {t('history.endDate')}: {new Date(detailedMembershipStatus.date).toLocaleDateString('hr-HR')}
                        </p>
                        {detailedMembershipStatus.endReason && (
                          <p className="text-sm text-gray-500">
                            {t('history.endReason')}: {translateEndReason(detailedMembershipStatus.endReason, )}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Membership Card Management - visible only if fee is current */}
            {isEditing && isFeeCurrent && cardManagerProps && (
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-3">{t('feeSection.membershipCardManagement')}</h3>
                <MembershipCardManagerAdapter {...cardManagerProps} />
              </div>
            )}
            
            {isEditing && !isFeeCurrent && cardManagerProps && (
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-3 text-amber-700">{t('feeSection.membershipCardManagement')}</h3>
                <div className="text-amber-600 p-3 bg-amber-50 rounded-md">
                  <p>{t('feeSection.membershipCardManagementInfo')}</p>
                </div>
              </div>
            )}

            {/* Payment Form - visible only for administrators */}
            {canEdit && isEditing && (
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-3">{t('feeSection.processPaymentTitle')}</h3>
                <form onSubmit={(e) => { void handleFeePayment(e); } }>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700">
                        {t('feeSection.paymentDate')}
                      </label>
                      <div className="mt-1 relative">
                        <Input
                          type="date"
                          id="paymentDate"
                          value={formatInputDate(paymentDate) ?? ''}
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
                          ? t('feeSection.newMemberNovDecPayment')
                          : t('feeSection.novDecPaymentNextYear')}
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
                        {t('feeSection.processPayment')}
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700">
                        {t('feeSection.confirmPaymentQuestion', { 
                          firstName: member?.first_name || '', 
                          lastName: member?.last_name || '' 
                        })}
                        </p>
                        <div className="flex space-x-2">
                          <Button
                            type="submit"
                            disabled={isSubmitting}
                            variant="default"
                            className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                          >
                            {isSubmitting ? "Processing..." : t('common:confirm')}
                          </Button>
                          <Button
                            type="button"
                            onClick={() => setShowPaymentConfirm(false)}
                            variant="outline"
                            className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                          >
                            {t('common:cancel')}
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
              {t('feeSection.membershipHistory')}
            </button>

            {showHistory && (
              <div className="mt-4 space-y-4">
                {/* Header with Title and Buttons */}
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-medium">{t('feeSection.membershipPeriods')}</h4>
                  {canEdit && !isEditingHistory && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditingHistory(true)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      {t('feeSection.editHistory')}
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
                        {t('feeSection.saveHistory')}
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
                        {t('common:cancel')}
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
                                <label className="text-xs text-gray-500">{t('history.startDate')}</label>
                                <Input
                                  type="date"
                                  value={formatInputDate(period.start_date) ?? ''}
                                  onChange={(e) => handlePeriodChange(index, 'start_date', e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500">{t('history.endDate')}</label>
                                <Input
                                  type="date"
                                  value={formatInputDate(period.end_date) ?? ''}
                                  onChange={(e) => handlePeriodChange(index, 'end_date', e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500">{t('history.endReason')}</label>
                                <select
                                  className="w-full p-2 border rounded"
                                  value={period.end_reason ?? ''}
                                  onChange={(e) => handlePeriodChange(index, "end_reason", e.target.value as MembershipEndReason)}
                                >
                                  <option value="">{t('history.selectReason')}</option>
                                  {endReasonOptions.map(reason => (
                                    <option key={reason} value={reason}>
                                      {t(`memberProfile.history.reasons.${reason}`)}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeletePeriod(index)}
                              >
                                <X className="h-4 w-4 mr-1" />
                                {t('history.delete')}
                              </Button>
                            </div>
                          </div>
                        ))}
                        {/* Add new period */}
                        <div className="p-3 border rounded-md bg-gray-50 border-dashed">
                          <h5 className="text-sm font-medium mb-2">{t('history.addNewPeriod')}</h5>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-gray-500">{t('history.startDate')}</label>
                              <Input
                                type="date"
                                value={formatInputDate(newPeriod?.start_date) ?? ''}
                                onChange={(e) => setNewPeriod({ ...(newPeriod ?? {}), start_date: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500">{t('history.endDate')}</label>
                              <Input
                                type="date"
                                value={formatInputDate(newPeriod?.end_date) ?? ''}
                                onChange={(e) => setNewPeriod({ ...(newPeriod ?? {}), end_date: e.target.value })}
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="text-xs text-gray-500">{t('history.endReason')}</label>
                              <select
                                className="w-full p-2 border rounded"
                                value={newPeriod?.end_reason ?? ""}
                                onChange={(e) => setNewPeriod({ ...(newPeriod ?? {}), end_reason: e.target.value as MembershipEndReason })}
                              >
                                <option value="">{t('history.selectReason')}</option>
                                {endReasonOptions.map(reason => (
                                  <option key={reason} value={reason}>
                                    {t(`memberProfile.history.reasons.${reason}`)}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={handleAddPeriod}
                              disabled={!newPeriod?.start_date}
                            >
                              {t('history.addPeriod')}
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
                                <p className="text-xs text-gray-500">{t('history.startDate')}</p>
                                <p>{format(new Date(period.start_date), 'dd.MM.yyyy')}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">{t('history.endDate')}</p>
                                <p>{period.end_date ? format(new Date(period.end_date), 'dd.MM.yyyy') : ''}</p>
                              </div>
                              {period.end_reason && (
                                <div className="col-span-2">
                                  <p className="text-xs text-gray-500">{t('history.endReason')}</p>
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
                  <p className="text-gray-500 italic">{t('history.noHistory')}</p>
                )}

                {/* Prikaz ukupnog trajanja članstva */}
                {membershipHistory?.totalDuration && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium">{t('feeSection.totalDuration')}:</p>
                    <p className="font-semibold text-lg">{membershipHistory.totalDuration}</p>
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