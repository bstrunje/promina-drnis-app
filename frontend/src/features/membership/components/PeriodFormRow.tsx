import React from "react";
import { MembershipPeriod, PeriodFormRowProps } from "../types/membershipTypes";
import { Input } from "@components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select";
import { isoToHrFormat } from "../../../utils/dateUtils";

const PeriodFormRow: React.FC<PeriodFormRowProps> = ({
  period,
  index,
  isEditing,
  canSeeEndReason,
  canManageEndReasons,
  onPeriodChange,
  onEndReasonChange
}) => {
  if (isEditing) {
    return (
      <div className="space-y-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Datum početka (DD.MM.YYYY)</label>
          <Input
            type="text"
            value={isoToHrFormat(period.start_date as string)}
            onChange={(e) =>
              onPeriodChange(
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
            value={period.end_date ? isoToHrFormat(period.end_date as string) : ""}
            onChange={(e) =>
              onPeriodChange(
                index,
                "end_date",
                e.target.value
              )
            }
            placeholder="Ostavite prazno za aktivan period"
          />
        </div>
        {canManageEndReasons && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Razlog završetka</label>
            <Select
              value={period.end_reason || ""}
              onValueChange={(value) => 
                onPeriodChange(index, "end_reason", value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Odaberite razlog završetka" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nije specificirano</SelectItem>
                <SelectItem value="withdrawal">Istupanje</SelectItem>
                <SelectItem value="non_payment">Neplaćanje članarine</SelectItem>
                <SelectItem value="expulsion">Isključenje</SelectItem>
                <SelectItem value="death">Smrt</SelectItem>
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
            <span className="font-medium">{isoToHrFormat(period.start_date as string)}</span>
          </div>
          <div className="text-right">
            <span className="block text-xs text-gray-500">Do:</span>
            <span className="font-medium">
              {period.end_date 
                ? isoToHrFormat(period.end_date as string)
                : ""}
            </span>
          </div>
        </div>
        
        {/* Prikaz razloga završetka samo ako postoji i korisnik ima pravo vidjeti */}
        {canSeeEndReason && period.end_reason && (
          <div className="text-xs text-gray-600 mt-1 flex justify-between items-center">
            <span>Razlog završetka: 
              <span className="ml-1 font-medium">
                {period.end_reason === "withdrawal" && "Istupanje"}
                {period.end_reason === "non_payment" && "Neplaćanje članarine"}
                {period.end_reason === "expulsion" && "Isključenje"}
                {period.end_reason === "death" && "Smrt"}
                {period.end_reason && !["withdrawal", "non_payment", "expulsion", "death"].includes(period.end_reason) && period.end_reason}
              </span>
            </span>
            
            {/* Omogući promjenu razloga završetka direktno ako korisnik ima prava */}
            {period.period_id && period.period_id > 0 && canManageEndReasons && (
              <div className="ms-auto">
                <Select
                  value={period.end_reason || ""}
                  onValueChange={(value) => 
                    onEndReasonChange(period.period_id as number, value)
                  }
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Odaberi razlog" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nije specificirano</SelectItem>
                    <SelectItem value="withdrawal">Istupanje</SelectItem>
                    <SelectItem value="non_payment">Neplaćanje članarine</SelectItem>
                    <SelectItem value="expulsion">Isključenje</SelectItem>
                    <SelectItem value="death">Smrt</SelectItem>
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
