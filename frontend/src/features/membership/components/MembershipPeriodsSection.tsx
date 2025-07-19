import React from "react";
import { Calendar, Edit, Save, X, Plus } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from "@components/ui/card";
import { Button } from "@components/ui/button";
import { MembershipPeriodsSectionProps } from "../types/membershipTypes";
import PeriodFormRow from "./PeriodFormRow";
import { parseISO } from "date-fns";
import { useMembershipPeriods } from "../hooks/useMembershipPeriods";
import { parseDate } from '../../../utils/dateUtils';


const MembershipPeriodsSection: React.FC<MembershipPeriodsSectionProps> = ({
  member,
  periods,
  totalDuration,
  feePaymentYear,
  feePaymentDate,
  onUpdatePeriods,
}) => {
  const { t } = useTranslation();
  const {
    isEditing,
    editedPeriods,
    isSubmitting,
    newPeriod,
    canEdit,
    canManageEndReasons,
    canSeeEndReason,
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
              {t('membership.periods.edit')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm">
            <span className="font-medium">{t('membership.membershipDetails.totalDuration')}: </span>
            {totalDuration}
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
                <X className="w-4 h-4 mr-1" /> {t('membership.periods.cancel')}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => { void handleSave(); }} // Sigurnosna promjena: void za no-floating-promises
                disabled={isSubmitting}
                className="bg-black hover:bg-blue-500 transition-colors"
              >
                {isSubmitting ? (
                  <>{t('membership.periods.saving')}</>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-1" /> {t('membership.periods.save')}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddPeriod}
                className="ml-auto"
              >
                <Plus className="w-4 h-4 mr-1" /> {t('membership.periods.addPeriod')}
              </Button>
            </div>
          )}

          <div className="space-y-2">
            {[...(isEditing ? editedPeriods : periods)]
              .sort((a, b) =>
                parseISO(a.start_date).getTime() - parseISO(b.start_date).getTime()
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
                      key={period.period_id}
                      period={period}
                      index={index}
                      isEditing={!!isEditing}
                      canSeeEndReason={!!canSeeEndReason}
                      canManageEndReasons={!!canManageEndReasons}
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
                      <Save className="w-3 h-3 mr-1" /> {t('common.save')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNewPeriod(null)}
                      className="h-7 text-xs"
                    >
                      <X className="w-3 h-3 mr-1" /> {t('common.cancel')}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Datum početka (DD.MM.YYYY)</label>
                    <input
                      type="text"
                      value={newPeriod?.start_date ? (() => {
                        const dateStr = typeof newPeriod.start_date === 'string' ? newPeriod.start_date : '';
                        const parsedDate = parseDate(dateStr);
                        return parsedDate ? parsedDate.toLocaleDateString('hr-HR') : '';
                      })() : ''}
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
                      value={newPeriod?.end_date ? (() => {
                        const dateStr = typeof newPeriod.end_date === 'string' ? newPeriod.end_date : '';
                        const parsedDate = parseDate(dateStr);
                        return parsedDate ? parsedDate.toLocaleDateString('hr-HR') : '';
                      })() : ''}
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
                        // Zamijenjeno || s ?? zbog ESLint pravila
                        value={newPeriod.end_reason ?? ""}
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
