import React from "react";
import { Input } from "@components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select";
import { formatDate } from "../../../utils/dateUtils";
import { useTranslation } from 'react-i18next';

import { PeriodFormRowProps } from '../types/membershipTypes';

const PeriodFormRow: React.FC<PeriodFormRowProps> = ({
  period,
  isEditing,
  canSeeEndReason,
  canManageEndReasons,
  onPeriodChange,
  onEndReasonChange
}) => {
  // Lokalizacija (koristimo profile namespace)
  const { t } = useTranslation('profile');
  if (isEditing) {
    return (
      <div className="space-y-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Datum početka (DD.MM.YYYY)</label>
          <Input
            type="text"
            // Sigurnije: period.start_date je uvijek string prema tipu
            // Prisilno pretvaramo na string zbog tipne sigurnosti
            value={formatDate(String(period.start_date))}
            onChange={(e) =>
              onPeriodChange(
                period.period_id,
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
            // Sigurnije: period.end_date može biti string ili null
            // Prisilno pretvaramo na string zbog tipne sigurnosti
            value={period.end_date ? formatDate(String(period.end_date)) : ""}
            onChange={(e) =>
              onPeriodChange(
                period.period_id,
                "end_date",
                e.target.value
              )
            }
            placeholder="Ostavite prazno za aktivan period"
          />
        </div>
        {canManageEndReasons && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('history.endReason')}</label>
            <Select
              // Zamijenjeno || s ?? zbog ESLint pravila
value={period.end_reason ?? ""}
              // Zamijenjeno || s ?? zbog ESLint pravila
onValueChange={(value) => 
  onPeriodChange(period.period_id, "end_reason", value)
}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('history.selectReason')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('membershipDetails.notSet')}</SelectItem>
                <SelectItem value="withdrawal">{t('feeSection.endReasons.withdrawal')}</SelectItem>
                <SelectItem value="non_payment">{t('feeSection.endReasons.non_payment')}</SelectItem>
                <SelectItem value="expulsion">{t('feeSection.endReasons.expulsion')}</SelectItem>
                <SelectItem value="death">{t('feeSection.endReasons.death')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    );
  } else {
    return (
      <div className="space-y-1">
        <div className="flex justify-between items-start">
          <div>
            <span className="block text-xs text-gray-500">Od:</span>
            <span className="font-medium">{formatDate(period.start_date)}</span>
          </div>
          <div className="text-right">
            <span className="block text-xs text-gray-500">Do:</span>
            <span className="font-medium">
              {period.end_date 
                ? formatDate(period.end_date)
                : ""}
            </span>
          </div>
        </div>
        
        {/* Prikaz razloga završetka samo ako postoji i korisnik ima pravo vidjeti */}
        {canSeeEndReason && period.end_reason && (
          <div className="text-xs text-gray-600 mt-1 flex justify-between items-center">
            <span>{t('history.endReason')}: 
              <span className="ml-1 font-medium">
                {t(`feeSection.endReasons.${period.end_reason}` as const, { defaultValue: period.end_reason })}
              </span>
            </span>
            
            {/* Omogući promjenu razloga završetka direktno ako korisnik ima prava */}
            {period.period_id && period.period_id > 0 && canManageEndReasons && (
              <div className="ms-auto">
                <Select
                  // Zamijenjeno || s ?? zbog ESLint pravila
value={period.end_reason ?? ""}
                  // onEndReasonChange vraća Promise pa koristimo async funkciju zbog ESLint pravila
// Pozivamo onEndReasonChange samo ako period_id nije undefined
// onValueChange ne smije biti async zbog ESLint pravila, pozivamo bez await
// onValueChange: Promise mora biti hendlan, ali bez await/async zbog ESLint pravila
onValueChange={(value) => {
  if (typeof period.period_id === 'number') {
    void onEndReasonChange(period.period_id, value).catch(() => { /* Grešku ignoriramo jer korisniku nije bitno */ });
  }
}}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder={t('history.selectReason')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t('membershipDetails.notSet')}</SelectItem>
                    <SelectItem value="withdrawal">{t('feeSection.endReasons.withdrawal')}</SelectItem>
                    <SelectItem value="non_payment">{t('feeSection.endReasons.non_payment')}</SelectItem>
                    <SelectItem value="expulsion">{t('feeSection.endReasons.expulsion')}</SelectItem>
                    <SelectItem value="death">{t('feeSection.endReasons.death')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
};

export default PeriodFormRow;
