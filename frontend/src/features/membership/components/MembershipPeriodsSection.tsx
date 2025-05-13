import React from "react";
import { Calendar, Edit, Save, X, Plus, Trash } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@components/ui/card";
import { Button } from "@components/ui/button";
import { MembershipPeriodsSectionProps } from "../types/membershipTypes";
import PeriodFormRow from "./PeriodFormRow";
import { parseISO } from "date-fns";
import { useMembershipPeriods } from "../hooks/useMembershipPeriods";
import { parseDate } from '../utils/dateUtils';
import { formatDate } from '../../../utils/dateUtils';

const MembershipPeriodsSection: React.FC<MembershipPeriodsSectionProps> = ({
  member,
  periods,
  totalDuration,
  feePaymentYear,
  feePaymentDate,
  onUpdatePeriods,
  userRole
}) => {
  const {
    isEditing,
    editedPeriods,
    isSubmitting,
    newPeriod,
    canEdit,
    canManageEndReasons,
    canSeeEndReason,
    calculateTotalDuration,
    handleEndReasonChange,
    handleEdit,
    handleCancel,
    handleSave,
    handlePeriodChange,
    handleNewPeriodChange,
    handleAddPeriod,
    handleSaveNewPeriod,
    formatFeePaymentInfo,
    setNewPeriod
  } = useMembershipPeriods(
    periods, 
    member.member_id, 
    feePaymentYear, 
    feePaymentDate,
    onUpdatePeriods
  );

  if (!periods || periods.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Povijest članstva</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Nema podataka o povijesti članstva.</p>
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
            Povijest članstva
          </CardTitle>
          {canEdit && !isEditing && (
            <Button 
              onClick={handleEdit}
              className="bg-black hover:bg-blue-500 transition-colors"
            >
              <Edit className="w-4 h-4 mr-2" />
              Uredi
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm">
            <span className="font-medium">Ukupno trajanje: </span>
            {totalDuration || calculateTotalDuration(periods)}
          </div>

          <div className="text-sm">
            <span className="font-medium">Posljednja uplata članarine: </span>
            {formatFeePaymentInfo(feePaymentYear, feePaymentDate)}
          </div>

          {/* Akcije za uređivanje */}
          {isEditing && (
            <div className="flex space-x-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                <X className="w-4 h-4 mr-1" /> Odustani
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSave}
                disabled={isSubmitting}
                className="bg-black hover:bg-blue-500 transition-colors"
              >
                {isSubmitting ? (
                  <>Spremanje...</>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-1" /> Spremi
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddPeriod}
                className="ml-auto"
              >
                <Plus className="w-4 h-4 mr-1" /> Dodaj period
              </Button>
            </div>
          )}

          <div className="space-y-2">
            {[...(isEditing ? editedPeriods : periods)]
              .sort((a, b) =>
                parseISO(a.start_date as string).getTime() - parseISO(b.start_date as string).getTime()
              )
              .map((period, index) => {
                return (
                  <div
                    key={period.period_id}
                    className="border-l-2 border-purple-500 pl-4 py-2"
                  >
                    <div className="text-sm font-medium">
                      Period {index + 1}:{" "}
                    </div>
                    <PeriodFormRow
                      period={period}
                      index={index}
                      isEditing={isEditing}
                      canSeeEndReason={canSeeEndReason}
                      canManageEndReasons={canManageEndReasons}
                      onPeriodChange={handlePeriodChange}
                      onEndReasonChange={handleEndReasonChange}
                    />
                  </div>
                );
              })}

            {/* Forma za novi period */}
            {isEditing && newPeriod && (
              <div className="border-l-2 border-green-500 pl-4 py-2 mt-3">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm font-medium">Novi period:</div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleSaveNewPeriod();
                      }}
                      className="h-7 text-xs"
                    >
                      <Save className="w-3 h-3 mr-1" /> Spremi
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNewPeriod(null)}
                      className="h-7 text-xs"
                    >
                      <X className="w-3 h-3 mr-1" /> Odustani
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Datum početka (DD.MM.YYYY)</label>
                    <input
                      type="text"
                      value={newPeriod.start_date ? parseDate($1).toLocaleDateString('hr-HR') : ''}
                      onChange={(e) =>
                        handleNewPeriodChange(
                          "start_date",
                          e.target.value
                        )
                      }
                      className="w-full p-2 border rounded"
                      placeholder="31.12.2025"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Datum završetka (DD.MM.YYYY)</label>
                    <input
                      type="text"
                      value={newPeriod.end_date ? parseDate($1).toLocaleDateString('hr-HR') : ''}
                      onChange={(e) =>
                        handleNewPeriodChange(
                          "end_date",
                          e.target.value
                        )
                      }
                      className="w-full p-2 border rounded"
                      placeholder="Ostavite prazno za aktivan period"
                    />
                  </div>
                  {newPeriod.end_date && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Razlog završetka</label>
                      <select
                        value={newPeriod.end_reason || ""}
                        onChange={(e) =>
                          handleNewPeriodChange(
                            "end_reason",
                            e.target.value
                          )
                        }
                        className="w-full p-2 border rounded"
                      >
                        <option value="">Nije specificirano</option>
                        <option value="withdrawal">Istupanje</option>
                        <option value="non_payment">Neplaćanje članarine</option>
                        <option value="expulsion">Isključenje</option>
                        <option value="death">Smrt</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MembershipPeriodsSection;
