import React, { useState, useCallback, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@components/ui/card";
import { Calendar, Edit, Save, X } from "lucide-react";
import { MembershipEndReason, MembershipPeriod } from "@shared/membership";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { useAuth } from "../src/context/AuthContext";
import { useToast } from "../components/ui/toast";
import {
  format,
  parseISO,
  addYears,
  isAfter,
  isBefore,
  isValid,
} from "date-fns";
import { API_BASE_URL } from "@/utils/config";
import { AdminPermissions } from '../shared/types/permissions';

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

  const calculateTotalDuration = useCallback((periods: MembershipPeriod[]): string => {
    const totalDays = periods.reduce((total, period) => {
      const start = parseISO(period.start_date);
      const end = period.end_date ? parseISO(period.end_date) : new Date();
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

  const handleEndReasonChange = useCallback(async (periodId: number, newReason: string) => {
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
        title: "Success", 
        description: "End reason updated successfully"
      });

    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to update end reason",
        variant: "destructive"  
      });
    }
  }, [memberId, onUpdate, editedPeriods]);

  // Effect za sinkronizaciju periods prop-a sa lokalnim stanjem
  useEffect(() => {
    setEditedPeriods(periods);
  }, [periods]);

  useEffect(() => {
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
      const dateValue = parseISO(value);
      if (!isValid(dateValue)) {
        console.error('Invalid date:', value);
        return;
      }

      if (field === "start_date") {
        if (isAfter(dateValue, new Date())) {
          console.error('Start date cannot be in the future');
          return;
        }
        if (periodToUpdate.end_date && isAfter(dateValue, parseISO(periodToUpdate.end_date))) {
          console.error('Start date must be before end date');
          return;
        }
      } else if (field === "end_date") {
        if (isBefore(dateValue, parseISO(periodToUpdate.start_date))) {
          console.error('End date must be after start date');
          return;
        }
        if (isAfter(dateValue, addYears(new Date(), 100))) {
          console.error('End date too far in the future');
          return;
        }
      }
    }

    const periodIndex = updatedPeriods.findIndex(
      p => p.period_id === periodToUpdate.period_id
    );

    updatedPeriods[periodIndex] = {
      ...periodToUpdate,
      [field]: value,
    };

    setEditedPeriods(updatedPeriods);
  };

  const handleAddPeriod = () => {
    setNewPeriod({
      start_date: new Date().toISOString().split("T")[0],
      end_date: "",
    });
  };

  const handleNewPeriodChange = (
    field: keyof MembershipPeriod,
    value: string
  ) => {
    if (!newPeriod) return;

    if (field === "start_date" || field === "end_date") {
      const dateValue = parseISO(value);
      if (!isValid(dateValue)) {
        console.error("Invalid date:", value);
        return;
      }
    }

    setNewPeriod((prev) =>
      prev
        ? {
            ...prev,
            [field]: value,
          }
        : null
    );
  };

  const handleSaveNewPeriod = () => {
    if (!newPeriod?.start_date) return;

    const startDate = parseISO(newPeriod.start_date);
    if (newPeriod.end_date) {
      const endDate = parseISO(newPeriod.end_date);
      if (
        !isValid(startDate) ||
        !isValid(endDate) ||
        isAfter(startDate, endDate)
      ) {
        console.error("Invalid date range");
        return;
      }
    }

    const updatedPeriods = [
      ...editedPeriods,
      {
        period_id: Math.floor(Math.random() * -1000),
        member_id: periods[0]?.member_id || 0,
        start_date: newPeriod.start_date,
        end_date: newPeriod.end_date || undefined,
        end_reason: newPeriod.end_reason,
      } as MembershipPeriod,
    ];

    setEditedPeriods(updatedPeriods);
    setNewPeriod(null);
  };

  const formatFeePaymentInfo = (year?: number, date?: string): string => {
    if (!year || !date) return "No payment information available";

    const paymentDate = new Date(date);
    const paymentMonth = paymentDate.getMonth();

    if (paymentMonth >= 10) {
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

    return (
      feePaymentYear === currentYear ||
      (feePaymentYear === currentYear &&
        feePaymentYear === currentYear &&
        paymentMonth >= 10)
    );
  };

  const getMembershipType = (): string => {
    if (!feePaymentYear || !feePaymentDate) return "Unknown";

    const paymentDate = new Date(feePaymentDate);
    const paymentMonth = paymentDate.getMonth();
    const now = new Date();
    const currentYear = now.getFullYear();

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
                new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
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
                          <Input
                            type="date"
                            value={
                              new Date(period.start_date)
                                .toISOString()
                                .split("T")[0]
                            }
                            onChange={(e) =>
                              handlePeriodChange(
                                index,
                                "start_date",
                                e.target.value
                              )
                            }
                          />
                          <Input
                            type="date"
                            value={
                              period.end_date
                                ? new Date(period.end_date)
                                    .toISOString()
                                    .split("T")[0]
                                : ""
                            }
                            onChange={(e) =>
                              handlePeriodChange(
                                index,
                                "end_date",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </>
                    ) : (
                      <div className="text-sm flex gap-2 items-center">
                        <span className="font-medium">Start:</span>
                        {format(
                          parseISO(period.start_date.toString()),
                          "dd.MM.yyyy"
                        )}
                        {period.end_date && (
                          <>
                            <span className="font-medium ml-2">End:</span>
                            {format(
                              parseISO(period.end_date.toString()),
                              "dd.MM.yyyy"
                            )}
                            {period.end_reason && canSeeEndReason && (
                              <span className="text-gray-600 ml-2">
                                ({period.end_reason})
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    )}
                    {period.end_date && canManageEndReasons && (
                      <div className="mt-2">
                        <select
                          className="p-1 text-sm border rounded"
                          value={period.end_reason || ""}
                          onChange={(e) => handleEndReasonChange(period.period_id, e.target.value)}
                        >
                          <option value="">Select reason</option>
                          <option value="withdrawal">Withdrawal</option>
                          <option value="non_payment">Non-payment</option>
                          <option value="expulsion">Expulsion</option>
                          <option value="death">Death</option>
                        </select>
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
                {new Date(currentPeriod.start_date).toLocaleDateString()} -
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
                    <label className="block text-sm">Start Date</label>
                    <Input
                      type="date"
                      value={newPeriod.start_date || ""}
                      onChange={(e) =>
                        handleNewPeriodChange("start_date", e.target.value)
                      }
                    />

                    <label className="block text-sm">
                      End Date (leave empty for current period)
                    </label>
                    <Input
                      type="date"
                      value={newPeriod.end_date || ""}
                      onChange={(e) =>
                        handleNewPeriodChange("end_date", e.target.value)
                      }
                    />

                    {newPeriod.end_date && (
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
