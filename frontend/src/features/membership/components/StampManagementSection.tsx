import React from "react";
import { useTranslation } from 'react-i18next';
import { StampManagementSectionProps } from "../types/membershipTypes";
import { Label } from "@components/ui/label";
import { Checkbox } from "@components/ui/checkbox";
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

}) => {
  const { t } = useTranslation('profile');
  const canEdit = userRole === 'member_administrator' || userRole === 'member_superuser';
  
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
  
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between mb-2">
        <h4 className="font-medium">{t('stamp.title')}</h4>
      </div>
      
      {/* Sekcija za markice tekuće godine */}
      <div className="bg-white border rounded-md p-3 mb-3">
        <div className="flex justify-between mb-2">
          <h5 className="font-medium text-sm">{getCurrentYear()} <span className="hidden sm:inline">{t('stamp.currentYearSuffix')}</span></h5>
          
          {/* Status inventara za tekuću godinu */}
          {inventoryStatus ? (
            <span className={`text-xs ${bg} px-2 py-1 rounded`}>
              <span className="sm:inline">{t('stamp.availableShort')}</span><span className="hidden sm:inline"> {t('stamp.availableUnit')}</span>:{" "}
              <span className={`font-bold ${text}`}>
                {inventoryStatus.remaining}
              </span>
            </span>
          ) : (
            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
              <span className="sm:inline">{t('stamp.availableShort')}</span><span className="hidden sm:inline"> {t('stamp.availableUnit')}</span>:{" "}
              <span className="font-bold">
                --
              </span>
            </span>
          )}
        </div>
        
        {/* Provjera ima li član dodijeljenu člansku iskaznicu */}
        {!member?.membership_details?.card_number ? (
          <div className="text-sm text-amber-600 italic">
            {t('feeSection.cardNumberRequired')}
          </div>
        ) : /* Provjera je li članarina plaćena za tekuću godinu */
        ((member?.membership_details?.fee_payment_year === getCurrentYear()) || (member?.membership_details?.card_stamp_issued ?? false)) ? (
          <div className="flex items-center space-x-3">
            {/* Ako korisnik može uređivati i nije obični član, prikaži checkbox */}
            {canEdit ? (
              <>
                <Checkbox 
                  id="stamp-checkbox"
                  checked={stampIssued}
                  onCheckedChange={(newState) => { void onStampToggle(newState === true, userRole); }}
                  disabled={isIssuingStamp || 
                    /* Administrator ne može vratiti markicu nakon što je izdana */
                    (stampIssued && userRole === 'member_administrator')}
                />
                <Label htmlFor="stamp-checkbox" className="text-sm font-medium cursor-pointer">
                  {t('stamp.issuedLabel')}
                  {isIssuingStamp && <RefreshCw className="w-3 h-3 ml-2 inline animate-spin" />}
                </Label>
              </>
            ) : (
              /* Za obične članove samo prikaz statusa bez mogućnosti upravljanja */
              <div className="flex items-center">
                <div className={`w-4 h-4 rounded-sm flex items-center justify-center mr-3 ${stampIssued ? 'bg-black text-white' : 'border border-gray-300'}`}>
                  {stampIssued && '✓'}
                </div>
                <span className="text-sm font-medium">
                  {stampIssued ? t('stamp.issuedLabel') : t('stamp.notIssuedLabel')}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-amber-600 italic">
            {t('stamp.feeNotPaidCurrent', { year: getCurrentYear() })}
          </div>
        )}
      </div>
      
      {/* Sekcija za markice sljedeće godine - omogućeno za obnove članstva pri kraju godine ili ako je članarina za sljedeću godinu već plaćena */}
      {((getCurrentDate().getMonth() >= 10) || 
        (member?.membership_details?.fee_payment_year === getCurrentYear() + 1) || 
        ((member?.membership_details?.next_year_stamp_issued) ?? false)) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <div className="flex justify-between mb-2">
            <h5 className="font-medium text-sm">{getCurrentYear() + 1} <span className="hidden sm:inline">{t('stamp.nextYearSuffix')}</span></h5>
            
            {/* Status inventara za sljedeću godinu */}
            {nextYearInventoryStatus ? (
              <span className={`text-xs ${bg} px-2 py-1 rounded`}>
                <span className="sm:inline">{t('stamp.availableShort')}</span><span className="hidden sm:inline"> {t('stamp.availableUnit')}</span>:{" "}
                <span className={`font-bold ${text}`}>
                  {nextYearInventoryStatus.remaining}
                </span>
              </span>
            ) : (
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                <span className="sm:inline">{t('stamp.availableShort')}</span><span className="hidden sm:inline"> {t('stamp.availableUnit')}</span>:{" "}
                <span className="font-bold">
                  --
                </span>
              </span>
            )}
          </div>
          
          {/* Provjera ima li član dodijeljenu člansku iskaznicu */}
          {!member?.membership_details?.card_number ? (
            <div className="text-sm text-amber-600 italic">
              {t('feeSection.cardNumberRequired')}
            </div>
          ) : /* Provjera je li članarina plaćena za sljedeću godinu */
          ((member?.membership_details?.fee_payment_year === getCurrentYear() + 1) ||
            (member?.membership_details?.next_year_stamp_issued ?? false)) ? (
            <div className="flex items-center space-x-3">
              {/* Ako korisnik može uređivati i nije obični član, prikaži checkbox */}
              {canEdit ? (
                <>
                  <Checkbox
                    id="next-year-stamp-checkbox"
                    checked={nextYearStampIssued}
                    onCheckedChange={(newState) => { void onNextYearStampToggle(newState === true, userRole); }}
                    disabled={isIssuingNextYearStamp || 
                      /* Administrator ne može vratiti markicu nakon što je izdana */
                      (nextYearStampIssued && userRole === 'member_administrator') || 
                      /* Onemogući izdavanje ako nema dostupnih markica */
                      (!nextYearStampIssued && nextYearInventoryStatus?.remaining === 0)}
                  />
                  <Label htmlFor="next-year-stamp-checkbox" className="text-sm font-medium cursor-pointer">
                    {t('stamp.issuedNextYear', { year: getCurrentYear() + 1 })}
                    {isIssuingNextYearStamp && <RefreshCw className="w-3 h-3 ml-2 inline animate-spin" />}
                  </Label>
                </>
              ) : (
                /* Za obične članove samo prikaz statusa bez mogućnosti upravljanja */
                <div className="flex items-center">
                  <div className={`w-4 h-4 rounded-sm flex items-center justify-center mr-3 ${nextYearStampIssued ? 'bg-black text-white' : 'border border-gray-300'}`}>
                    {nextYearStampIssued && '✓'}
                  </div>
                  <span className="text-sm font-medium">
                    {nextYearStampIssued ? t('stamp.issuedNextYear', { year: getCurrentYear() + 1 }) : t('stamp.notIssuedNextYear', { year: getCurrentYear() + 1 })}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-amber-600 italic">
              {t('stamp.feeNotPaidNext', { year: getCurrentYear() + 1 })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StampManagementSection;
