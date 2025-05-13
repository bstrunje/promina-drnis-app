import React, { useEffect } from "react";
import { StampManagementSectionProps } from "../types/membershipTypes";
import { Label } from "@components/ui/label";
import { RefreshCw } from "lucide-react";
import { getCurrentYear } from "../../../utils/dateUtils";
import { getCurrentDate } from '../../../utils/dateUtils';

const StampManagementSection: React.FC<StampManagementSectionProps> = ({
  member,
  inventoryStatus,
  nextYearInventoryStatus,
  stampIssued,
  nextYearStampIssued,
  isIssuingStamp,
  isIssuingNextYearStamp,
  onStampToggle,
  onNextYearStampToggle,
  userRole,
  isFeeCurrent = true,
}) => {
  const canEdit = userRole === 'admin' || userRole === 'superuser';
  
  // Helper funkcija za određivanje stilova na temelju životnog statusa člana
  const getStatusColors = () => {
    switch (member.life_status) {
      case "employed/unemployed":
        return {
          bg: "bg-blue-100",
          text: "text-blue-800"
        };
      case "child/pupil/student":
        return {
          bg: "bg-green-100",
          text: "text-green-800"
        };
      case "pensioner":
        return {
          bg: "bg-red-100",
          text: "text-red-800"
        };
      default:
        return {
          bg: "bg-gray-100",
          text: "text-gray-800"
        };
    }
  };
  
  // Dohvati stilove za trenutnog člana
  const { bg, text } = getStatusColors();
  
  // Dijagnostika - pratimo dostupnost inventoryStatus
  useEffect(() => {
    console.log("Current inventoryStatus:", inventoryStatus);
    console.log("Next year inventoryStatus:", nextYearInventoryStatus);
  }, [inventoryStatus, nextYearInventoryStatus]);
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between mb-2">
        <h4 className="font-medium">Status markica:</h4>
      </div>
      
      {/* Sekcija za markice tekuće godine */}
      <div className="bg-white border rounded-md p-3 mb-3">
        <div className="flex justify-between mb-2">
          <h5 className="font-medium text-sm">{getCurrentYear()} <span className="hidden sm:inline">(Tekuća godina)</span></h5>
          
          {/* Status inventara za tekuću godinu */}
          {inventoryStatus ? (
            <span className={`text-xs ${bg} px-2 py-1 rounded`}>
              <span className="sm:inline">Dostupno</span><span className="hidden sm:inline"> markica</span>:{" "}
              <span className={`font-bold ${text}`}>
                {inventoryStatus.remaining}
              </span>
            </span>
          ) : (
            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
              <span className="sm:inline">Dostupno</span><span className="hidden sm:inline"> markica</span>:{" "}
              <span className="font-bold">
                --
              </span>
            </span>
          )}
        </div>
        
        {/* Provjera je li članarina plaćena za tekuću godinu */}
        {(member?.membership_details?.fee_payment_year === getCurrentYear() || 
          member?.membership_details?.card_stamp_issued === true) ? (
          canEdit && (
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="stamp-toggle"
                checked={stampIssued}
                onChange={(e) => onStampToggle(e.target.checked)}
                disabled={isIssuingStamp || (!stampIssued && inventoryStatus?.remaining === 0)}
                className="w-4 h-4"
              />
              <Label htmlFor="stamp-toggle" className="text-sm font-medium cursor-pointer">
                Markica izdana
                {isIssuingStamp && <RefreshCw className="w-3 h-3 ml-2 inline animate-spin" />}
              </Label>
            </div>
          )
        ) : (
          <div className="text-sm text-amber-600 italic">
            Članarina za {getCurrentYear()} nije plaćena. Nije moguće upravljati markicom.
          </div>
        )}
      </div>
      
      {/* Sekcija za markice sljedeće godine - omogućeno za obnove članstva pri kraju godine ili ako je članarina za sljedeću godinu već plaćena */}
      {(getCurrentDate().getMonth() >= 10 || 
        member?.membership_details?.fee_payment_year === getCurrentYear() + 1 ||
        member?.membership_details?.next_year_stamp_issued === true) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <div className="flex justify-between mb-2">
            <h5 className="font-medium text-sm">{getCurrentYear() + 1} <span className="hidden sm:inline">(Sljedeća godina)</span></h5>
            
            {/* Status inventara za sljedeću godinu */}
            {nextYearInventoryStatus ? (
              <span className={`text-xs ${bg} px-2 py-1 rounded`}>
                <span className="sm:inline">Dostupno</span><span className="hidden sm:inline"> markica</span>:{" "}
                <span className={`font-bold ${text}`}>
                  {nextYearInventoryStatus.remaining}
                </span>
              </span>
            ) : (
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                <span className="sm:inline">Dostupno</span><span className="hidden sm:inline"> markica</span>:{" "}
                <span className="font-bold">
                  --
                </span>
              </span>
            )}
          </div>
          
          {/* Provjera je li članarina plaćena za sljedeću godinu */}
          {(member?.membership_details?.fee_payment_year === getCurrentYear() + 1 || 
            member?.membership_details?.next_year_stamp_issued === true) ? (
            canEdit && (
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="next-year-stamp-toggle"
                  checked={nextYearStampIssued}
                  onChange={(e) => onNextYearStampToggle(e.target.checked)}
                  disabled={isIssuingNextYearStamp || (!nextYearStampIssued && nextYearInventoryStatus?.remaining === 0)}
                  className="w-4 h-4"
                />
                <Label htmlFor="next-year-stamp-toggle" className="text-sm font-medium cursor-pointer">
                  Markica za {getCurrentYear() + 1} izdana
                  {isIssuingNextYearStamp && <RefreshCw className="w-3 h-3 ml-2 inline animate-spin" />}
                </Label>
              </div>
            )
          ) : (
            <div className="text-sm text-amber-600 italic">
              Članarina za {getCurrentYear() + 1} nije plaćena. Nije moguće upravljati markicom.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StampManagementSection;
