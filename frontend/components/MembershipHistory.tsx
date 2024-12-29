import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@components/ui/card";
import { Calendar, Edit, Save, X } from "lucide-react";
import { MembershipPeriod } from "@shared/types/membership";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { useAuth } from "../src/context/AuthContext";
import { format, parseISO } from 'date-fns';

interface MembershipHistoryProps {
  periods: MembershipPeriod[];
  feePaymentYear?: number;
  feePaymentDate?: string;
  totalDuration?: string;
  currentPeriod?: MembershipPeriod;
  onUpdate?: (periods: MembershipPeriod[]) => Promise<void>;
}

const MembershipHistory: React.FC<MembershipHistoryProps> = ({
  periods,
  feePaymentYear,
  feePaymentDate,
  totalDuration,
  onUpdate,
}) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedPeriods, setEditedPeriods] =
    useState<MembershipPeriod[]>(periods);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canEdit = user?.role === "superuser";

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
    updatedPeriods[index] = {
      ...updatedPeriods[index],
      [field]: value,
    };
    setEditedPeriods(updatedPeriods);
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

  const calculateTotalDuration = (periods: MembershipPeriod[]): string => {
    const totalDays = periods.reduce((total, period) => {
      const start = new Date(period.start_date);
      const end = period.end_date ? new Date(period.end_date) : new Date();
      return (
        total +
        Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      );
    }, 0);

    const years = Math.floor(totalDays / 365);
    const months = Math.floor((totalDays % 365) / 30);
    const days = totalDays % 30;

    return `${years} years, ${months} months, ${days} days`;
  };

  const formatFeePaymentInfo = (year?: number, date?: string): string => {
    if (!year || !date) return "No payment information available";

    const paymentDate = new Date(date);
    const paymentMonth = paymentDate.getMonth();

    if (paymentMonth >= 10) {
      // November or December
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

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Membership History
          </CardTitle>
          {canEdit && !isEditing && (
            <Button onClick={handleEdit}>
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

          <div className="text-sm">
            <span className="font-medium">Membership Status: </span>
            {isCurrentMembershipActive() ? "Active" : "Inactive"}
          </div>

          <div className="text-sm">
            <span className="font-medium">Membership Type: </span>
            {getMembershipType()}
          </div>

          <div className="space-y-2">
            {(isEditing ? editedPeriods : periods)
              .map((period, index) => (
                <div
                  key={period.period_id}
                  className="border-l-2 border-purple-500 pl-4 py-2"
                >
                  <div className="text-sm font-medium">
                    Period {periods.length - index}:
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
                    <>
                      <div className="text-sm">
                        <span className="font-medium">Start: </span>
                        {format(parseISO(period.start_date.toString()), 'dd.MM.yyyy')}
                      </div>
                      {period.end_date && (
                        <>
                          <div className="text-sm">
                            <span className="font-medium">End: </span>
                            {format(parseISO(period.end_date.toString()), 'dd.MM.yyyy')}
                          </div>
                          {period.end_reason && (
                            <div className="text-sm text-gray-600">
                              Reason: {period.end_reason}
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              ))
              .reverse()}
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
        </div>
      </CardContent>
    </Card>
  );
};

export default MembershipHistory;
