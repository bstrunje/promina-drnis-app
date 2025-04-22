import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@components/ui/card";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@components/ui/select";
import { useToast } from "@components/ui/toast";
import { MembershipPeriod, MembershipEndReason } from "@shared/membership";
import { Calendar, Edit, Save, X, Trash } from "lucide-react";
import {
  format,
  parseISO,
  isValid,
  formatDistanceStrict,
  isBefore,
  isAfter,
  addYears,
  parse,
  getMonth,
} from "date-fns";
import { hr } from "date-fns/locale";
import { API_BASE_URL } from "@/utils/config";
import { getCurrentDate, getCurrentYear, formatDate, isoToHrFormat, hrToIsoFormat } from '../src/utils/dateUtils';
import { AdminPermissions } from '../shared/types/permissions';
import { useAuth } from "../src/context/AuthContext";

interface MembershipHistoryProps {
  periods: MembershipPeriod[];
  memberId: number;
  feePaymentYear?: number;
  feePaymentDate?: string;
  totalDuration?: string;
  currentPeriod?: MembershipPeriod;
  onUpdate?: (periods: MembershipPeriod[]) => Promise<void>;
}

const MembershipHistory: React.FC<MembershipHistoryProps> = ({
  periods,
  memberId,
  feePaymentYear,
  feePaymentDate,
  totalDuration,
  onUpdate,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const hasAdminPrivileges = user?.role === "admin" || user?.role === "superuser";
  const [isEditing, setIsEditing] = useState(false);
  const [editedPeriods, setEditedPeriods] = useState<MembershipPeriod[]>(periods || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPeriod, setNewPeriod] = useState<Partial<MembershipPeriod> | null>(null);
  const [adminPermissions, setAdminPermissions] = useState<AdminPermissions | null>(null);

  const canEdit = user?.role === "superuser" || user?.role === "admin";
  const canManageEndReasons = 
    user?.role === 'superuser' || 
    (user?.role === 'admin' && adminPermissions?.can_manage_end_reasons);

  const calculateTotalDuration = React.useCallback((periods: MembershipPeriod[]): string => {
    const totalDays = periods.reduce((total, period) => {
      const start = parseISO(period.start_date);
      const end = period.end_date ? parseISO(period.end_date) : getCurrentDate();
      return (
        total +
        Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      );
    }, 0);

    const years = Math.floor(totalDays / 365);
    const months = Math.floor((totalDays % 365) / 30);
    const days = totalDays % 30;

    return `${years} years, ${months} months, ${days} days`;
  }, []);

  const handleEndReasonChange = React.useCallback(async (periodId: number, newReason: string) => {
    try {
      await fetch(
        `${API_BASE_URL}/members/${memberId}/membership-periods/${periodId}/end-reason`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            endReason: newReason,
          }),
        }
      );

      // Ažuriraj lokalno stanje
      const updatedPeriods = editedPeriods.map(p =>
        p.period_id === periodId 
          ? { ...p, end_reason: newReason as MembershipEndReason }
          : p
      );
      
      setEditedPeriods(updatedPeriods);

      // Obavijesti parent komponentu
      if (onUpdate) {
        await onUpdate(updatedPeriods);
      }

      toast({
        title: "Uspjeh",
        description: "End reason updated successfully",
        variant: "success"
      });

    } catch (error) {
      console.error(error);
      toast({
        title: "Greška",
        description: "Failed to update end reason",
        variant: "destructive"
      });
    }
  }, [memberId, onUpdate, editedPeriods]);

  // Effect za sinkronizaciju periods prop-a sa lokalnim stanjem
  React.useEffect(() => {
    setEditedPeriods(periods);
  }, [periods]);

  React.useEffect(() => {
    const fetchAdminPermissions = async () => {
      if (user?.role === 'admin') {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(
            `${API_BASE_URL}/admin/permissions/${user.member_id}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          );
          const permissions = await response.json();
          setAdminPermissions(permissions);
        } catch (error) {
          console.error('Failed to fetch admin permissions:', error);
        }
      }
    };

    fetchAdminPermissions();
  }, [user]);

  const canSeeEndReason = 
    user?.role === 'superuser' || 
    (user?.role === 'admin' && adminPermissions?.can_manage_end_reasons);

  const handleEdit = () => {
    setEditedPeriods(periods);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedPeriods(periods);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!onUpdate) return;
    setIsSubmitting(true);
    try {
      await onUpdate(editedPeriods);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update periods:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePeriodChange = (
    index: number,
    field: keyof MembershipPeriod,
    value: string
  ) => {
    const updatedPeriods = [...editedPeriods];
    
    const periodToUpdate = updatedPeriods.find(
      p => p.period_id === editedPeriods[index].period_id
    );

    if (!periodToUpdate) {
      console.error('Period not found');
      return;
    }

    if (field === "start_date" || field === "end_date") {
      // Za datume u hrvatskom formatu (DD.MM.YYYY)
      const date = parse(value, "dd.MM.yyyy", new Date());
      
      if (!isValid(date)) {
        console.error('Invalid date format. Please use DD.MM.YYYY');
        return;
      }

      if (field === "start_date") {
        if (isAfter(date, getCurrentDate())) {
          toast({
            title: "Greška",
            description: "Datum početka ne može biti u budućnosti",
            variant: "destructive"
          });
          return;
        }
        if (periodToUpdate.end_date && isAfter(date, parse(periodToUpdate.end_date, "dd.MM.yyyy", new Date()))) {
          toast({
            title: "Greška",
            description: "Datum početka mora biti prije datuma završetka",
            variant: "destructive"
          });
          return;
        }
      } else if (field === "end_date") {
        if (isBefore(date, parse(periodToUpdate.start_date, "dd.MM.yyyy", new Date()))) {
          toast({
            title: "Greška", 
            description: "Datum završetka mora biti nakon datuma početka",
            variant: "destructive"
          });
          return;
        }
        if (isAfter(date, addYears(getCurrentDate(), 100))) {
          toast({
            title: "Greška",
            description: "Datum završetka je predaleko u budućnosti",
            variant: "destructive"
          });
          return;
        }
      }
      
      // Konvertiraj u ISO format za spremanje u bazi, ali prikaži u HR formatu
      const isoDate = format(date, "yyyy-MM-dd");
      
      const periodIndex = updatedPeriods.findIndex(
        p => p.period_id === periodToUpdate.period_id
      );

      updatedPeriods[periodIndex] = {
        ...periodToUpdate,
        [field]: isoDate, // Spremamo u ISO formatu za backend
      };
    } else {
      // Za ostala polja
      const periodIndex = updatedPeriods.findIndex(
        p => p.period_id === periodToUpdate.period_id
      );

      updatedPeriods[periodIndex] = {
        ...periodToUpdate,
        [field]: value,
      };
    }

    setEditedPeriods(updatedPeriods);
  };

  const handleNewPeriodChange = (
    field: keyof MembershipPeriod,
    value: string
  ) => {
    if (!newPeriod) return;

    if (field === "start_date" || field === "end_date") {
      // Za datume u hrvatskom formatu
      if (value) {
        const date = parse(value, "dd.MM.yyyy", new Date());
        if (!isValid(date)) {
          toast({
            title: "Greška",
            description: "Neispravan format datuma. Koristite DD.MM.YYYY",
            variant: "destructive"
          });
          return;
        }
        
        // Konvertiraj u ISO format za spremanje
        const isoDate = format(date, "yyyy-MM-dd");
        
        setNewPeriod(prev => prev ? {
          ...prev,
          [field]: isoDate,
        } : null);
      } else {
        // Prazno polje je prihvatljivo za end_date
        setNewPeriod(prev => prev ? {
          ...prev,
          [field]: '',
        } : null);
      }
    } else {
      // Za ostala polja
      setNewPeriod(prev => prev ? {
        ...prev,
        [field]: value,
      } : null);
    }
  };

  const handleAddPeriod = () => {
    setNewPeriod({
      start_date: getCurrentDate().toISOString().split("T")[0],
      end_date: "",
    });
  };

  const handleSaveNewPeriod = () => {
    if (!newPeriod?.start_date) return;

    // Validacija datuma
    try {
      // Za startDate već imamo ISO format iz handleNewPeriodChange
      const startDate = parseISO(newPeriod.start_date);
      
      let endDate = null;
      if (newPeriod.end_date) {
        // Za endDate također već imamo ISO format
        endDate = parseISO(newPeriod.end_date);
        
        if (!isValid(startDate) || !isValid(endDate) || isAfter(startDate, endDate)) {
          toast({
            title: "Greška",
            description: "Neispravan raspon datuma", 
            variant: "destructive"
          });
          return;
        }
      }

      const updatedPeriods = [
        ...editedPeriods,
        {
          period_id: Math.floor(Math.random() * -1000),
          member_id: periods[0]?.member_id || 0,
          start_date: newPeriod.start_date, // Već je u ISO formatu
          end_date: newPeriod.end_date || undefined,
          end_reason: newPeriod.end_reason,
        } as MembershipPeriod,
      ];

      setEditedPeriods(updatedPeriods);
      setNewPeriod(null);
    } catch (error) {
      console.error("Error saving new period:", error);
      toast({
        title: "Greška",
        description: "Došlo je do greške prilikom dodavanja perioda",
        variant: "destructive"
      });
    }
  };

  const formatFeePaymentInfo = (year?: number, date?: string): string => {
    if (!year || !date) return "No payment information available";

    const paymentDate = parseISO(date);
    const paymentMonth = getMonth(paymentDate);

    if (paymentMonth >= 10) {
      return `Payment for ${year} (next year) - paid on ${formatDate(paymentDate)}`;
    } else {
      return `Payment for ${year} (current year) - paid on ${formatDate(paymentDate)}`;
    }
  };

  const isCurrentMembershipActive = (): boolean => {
    if (!feePaymentYear || !feePaymentDate) return false;

    const currentYear = getCurrentYear();
    const paymentDate = parseISO(feePaymentDate);
    const paymentMonth = getMonth(paymentDate);

    return (
      feePaymentYear === currentYear ||
      (feePaymentYear === currentYear &&
        feePaymentYear === currentYear &&
        paymentMonth >= 10)
    );
  };

  const getMembershipType = (): string => {
    if (!feePaymentYear || !feePaymentDate) return "Unknown";

    const paymentDate = parseISO(feePaymentDate);
    const paymentMonth = getMonth(paymentDate);
    const currentYear = getCurrentYear();

    if (paymentMonth >= 10 && feePaymentYear === currentYear + 1) {
      return "Renewed membership";
    } else if (feePaymentYear === currentYear) {
      return "New membership";
    } else {
      return "Past membership";
    }
  };

  if (!periods || periods.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Membership History</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No membership history available.</p>
        </CardContent>
      </Card>
    );
  }

  const currentPeriod = periods[periods.length - 1].end_date
    ? null
    : periods[periods.length - 1];

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Membership History
          </CardTitle>
          {canEdit && !isEditing && (
            <Button 
            onClick={handleEdit}
            className="bg-black hover:bg-blue-500 transition-colors"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          )}
        </div>
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

          <div className="space-y-2">
            {[...(isEditing ? editedPeriods : periods)]
              .sort((a, b) =>
                parseISO(a.start_date).getTime() - parseISO(b.start_date).getTime()
              )
              .map((period, index) => {
                const originalIndex = editedPeriods.findIndex(
                  p => p.period_id === period.period_id
                );

                return (
                  <div
                    key={period.period_id}
                    className="border-l-2 border-purple-500 pl-4 py-2"
                  >
                    <div className="text-sm font-medium">
                      Period {index + 1}:{" "}
                    </div>
                    {isEditing ? (
                      <>
                        <div className="space-y-2">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Datum početka (DD.MM.YYYY)</label>
                            <Input
                              type="text"
                              value={isoToHrFormat(period.start_date)}
                              onChange={(e) =>
                                handlePeriodChange(
                                  index,
                                  "start_date",
                                  e.target.value
                                )
                              }
                              placeholder="31.12.2025"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Datum završetka (DD.MM.YYYY)</label>
                            <Input
                              type="text"
                              value={period.end_date ? isoToHrFormat(period.end_date) : ""}
                              onChange={(e) =>
                                handlePeriodChange(
                                  index,
                                  "end_date",
                                  e.target.value
                                )
                              }
                              placeholder="31.12.2025"
                            />
                          </div>
                          {canManageEndReasons && typeof period.end_date === 'string' && period.end_date.trim() !== '' && (
                            <div className="mt-2">
                              <label className="block text-xs text-gray-500 mb-1">Razlog završetka</label>
                              <select
                                className="w-full p-2 text-sm border rounded"
                                value={period.end_reason || ""}
                                onChange={(e) => handlePeriodChange(index, "end_reason", e.target.value)}
                              >
                                <option value="">Odaberite razlog</option>
                                <option value="withdrawal">Istupanje</option>
                                <option value="non_payment">Neplaćanje članarine</option>
                                <option value="expulsion">Isključenje</option>
                                <option value="death">Smrt</option>
                              </select>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="text-sm flex gap-2 items-center">
                        <span className="font-medium">Početak:</span>
                        {formatDate(parseISO(period.start_date.toString()))}
                        {period.end_date && (
                          <>
                            <span className="font-medium ml-2">Kraj:</span>
                            {formatDate(parseISO(period.end_date.toString()))}
                            {period.end_reason && canSeeEndReason && (
                              <span className="text-gray-600 ml-2">
                                ({period.end_reason})
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          {isEditing && (
            <div className="flex gap-2 mt-4">
              <Button onClick={handleSave} disabled={isSubmitting}>
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
              <Button onClick={handleCancel} variant="outline">
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}

          {currentPeriod && (
            <div className="mt-4 pt-4 border-t">
              <span className="text-sm font-medium">Current Period: </span>
              <span className="text-sm">
                {formatDate(parseISO(currentPeriod.start_date))} -
                Present
              </span>
            </div>
          )}

          {isEditing && (
            <div className="mt-4">
              {!newPeriod ? (
                <Button
                  onClick={handleAddPeriod}
                  variant="outline"
                  className="w-full"
                >
                  + Add New Period
                </Button>
              ) : (
                <div className="border-l-2 border-purple-500 pl-4 py-2 mt-4">
                  <div className="text-sm font-medium">New Period:</div>
                  <div className="space-y-2 mt-2">
                    <label className="block text-sm">Datum početka (DD.MM.YYYY)</label>
                    <Input
                      type="text"
                      value={newPeriod.start_date ? isoToHrFormat(newPeriod.start_date) : ""}
                      onChange={(e) =>
                        handleNewPeriodChange("start_date", e.target.value)
                      }
                      placeholder="31.12.2025"
                    />
                    <label className="block text-sm">
                      Datum završetka (DD.MM.YYYY, ostavite prazno za trenutni period)
                    </label>
                    <Input
                      type="text"
                      value={newPeriod.end_date ? isoToHrFormat(newPeriod.end_date) : ""}
                      onChange={(e) => {
                        handleNewPeriodChange("end_date", e.target.value);
                        // DEBUG: log value to check what's in state
                        console.log('newPeriod.end_date:', e.target.value, newPeriod);
                      }}
                      placeholder="31.12.2025"
                    />
                    {/* DEBUG: prikaz vrijednosti za dijagnostiku */}
                    <div style={{fontSize: '10px', color: 'red'}}>
                      DEBUG: end_date = '{String(newPeriod.end_date)}'
                    </div>
                    {newPeriod && typeof newPeriod.end_date === 'string' && newPeriod.end_date.trim() !== '' && (
                      <>
                        <label className="block text-sm">End Reason</label>
                        <select
                          className="w-full p-2 border rounded"
                          value={newPeriod.end_reason || ""}
                          onChange={(e) =>
                            handleNewPeriodChange("end_reason", e.target.value)
                          }
                        >
                          <option value="">Select a reason</option>
                          <option value="withdrawal">Withdrawal</option>
                          <option value="non_payment">Non-payment</option>
                          <option value="expulsion">Expulsion</option>
                          <option value="death">Death</option>
                        </select>
                      </>
                    )}

                    <div className="flex space-x-2 mt-4">
                      <Button onClick={handleSaveNewPeriod}>Add Period</Button>
                      <Button
                        variant="outline"
                        onClick={() => setNewPeriod(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MembershipHistory;
