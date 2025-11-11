import React from "react";
import { MemberWithDetails } from "@shared/memberDetails.types";


import { Button } from "@components/ui/button";
import { UserCog } from "lucide-react";

import EditMemberPermissionsModal from "../permissions/EditMemberPermissionsModal";
import { useState } from "react";
import { formatMinutesToHoursAndMinutes, formatDate, getCurrentDate } from '../../../utils/dateUtils';
import { useTranslation } from 'react-i18next';
import { getMembershipDisplayStatusExternal as getMembershipDisplayStatus } from "./memberTableUtils";
import { useBranding } from '../../../hooks/useBranding';
import { useSystemSettings } from '../../../hooks/useSystemSettings';
import { isActiveMember } from '../../../utils/activityStatusHelpers';


interface MemberTableProps {
  filteredMembers: {
    key: string;
    title: string;
    members: MemberWithDetails[];
  }[];
  isAdmin?: boolean;
  isSuperuser?: boolean;
  onViewDetails?: (memberId: number) => void;
}

// Komponenta za prikaz tablice članova
export const MemberTable: React.FC<MemberTableProps> = ({
  filteredMembers,
  isAdmin,
  isSuperuser,
  onViewDetails,
}) => {
  const { t } = useTranslation('members');
  const { getPrimaryColor, getFullName } = useBranding();
  const { systemSettings } = useSystemSettings();
  
  // Dohvati activity hours threshold iz system settings (default 20)
  const activityHoursThreshold = systemSettings?.activityHoursThreshold ?? 20;

  // Pomoćna funkcija za određivanje boje statusa članstva
  // Bazirana na originalnoj implementaciji iz MemberList.tsx
  const getMembershipStatusColor = (statusKey: string): string => {
    switch (statusKey) {
      case "regularMember":
      case "honoraryMember":
      case "supportingMember":
        return "text-green-700 bg-green-100";
      case "formerMember":
        return "text-red-700 bg-red-100";
      case "pending":
        return "text-yellow-700 bg-yellow-100";
      default:
        return "text-gray-700 bg-gray-100";
    }
  };

  // Funkcija za dobivanje boje na temelju life_status
  const getLifeStatusColor = (member: MemberWithDetails) => {
    // Zadana boja za hover efekt
    let baseClass = "hover:bg-gray-50";

    // Dohvati status člana
    const { key } = getMembershipDisplayStatus(
      member.detailedStatus,
      !!isAdmin,
      !!isSuperuser,
      member.membership_type,
      member.periods,
      t
    );

    // Samo za redovne članove primijeni bojanje prema životnom statusu
    if (key === "regularMember") {
      const lifeStatus = member.life_status;

      switch (lifeStatus) {
        case "employed/unemployed":
          baseClass = "bg-blue-100 hover:bg-blue-200";
          break;
        case "child/pupil/student":
          baseClass = "bg-green-100 hover:bg-green-200";
          break;
        case "pensioner":
          baseClass = "bg-red-100 hover:bg-red-200";
          break;
      }
    }

    return baseClass;
  };





  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberWithDetails | null>(null);

  const renderActionButtons = (member: MemberWithDetails) => {
    return (
      <div
        className="flex justify-center space-x-1"
        style={{ minWidth: "120px" }}
      >
        <div style={{ width: "32px", textAlign: "center" }}>
          {isSuperuser && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedMember(member);
                setIsPermissionsModalOpen(true);
              }}
              title={t('memberTable.tooltips.managePermissions')}
            >
              <UserCog className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {isSuperuser && isPermissionsModalOpen && selectedMember && (
        <EditMemberPermissionsModal
          member={{
            ...selectedMember,
            full_name: selectedMember.full_name ?? `${selectedMember.first_name} ${selectedMember.last_name}`,
            role: selectedMember.role // Dodajemo rolu člana
          }}
          onClose={() => setIsPermissionsModalOpen(false)}
          onSave={() => {
            // Osvježi prikaz nakon promjene ovlasti ili role
            setIsPermissionsModalOpen(false);
            // Ovdje bi bilo dobro dodati osvježavanje liste članova ako je implementirano
          }}
        />
      )}
      {/* Print-only header */}
      <div className="hidden print:block text-center pb-6 border-b-2 border-gray-300 mb-6" style={{ pageBreakInside: 'avoid' }} id="print-header">
        <h1 className="text-2xl font-bold mb-2">{getFullName()}</h1>
        <h2 className="text-xl font-semibold mb-3">{t('memberList.printHeader.subtitle')}</h2>
        <div className="text-lg font-semibold inline-block px-6 py-2 mb-2 mt-2 rounded-md" style={{ backgroundColor: `${getPrimaryColor()}20`, borderWidth: '2px', borderStyle: 'solid', borderColor: `${getPrimaryColor()}80` }}>
          {t('memberList.printHeader.totalMembers')}: <span className="text-xl">{filteredMembers.reduce((count, group) => count + group.members.length, 0)}</span>
        </div>
        <div className="flex justify-center gap-4 mt-3 text-sm">
          <div className="border rounded-md px-3 py-1 bg-gray-50">
            {t('memberList.printHeader.active')}: <span className="font-semibold">{
              filteredMembers
                .flatMap(group => group.members)
                .filter(m => {
                  // Samo registrirani članovi mogu biti na listi
                  if (m.detailedStatus?.status !== 'registered') return false;
                  
                  // Aktivni su oni s dovoljno sati (koristimo activity_hours - tekuća i prošla godina)
                  return isActiveMember(m.activity_hours, activityHoursThreshold);
                }).length
            }</span>
          </div>
          <div className="border rounded-md px-3 py-1 bg-gray-50">
            {t('memberList.printHeader.inactive')}: <span className="font-semibold">{
              filteredMembers
                .flatMap(group => group.members)
                .filter(m => {
                  // Samo registrirani članovi mogu biti na listi
                  if (m.detailedStatus?.status !== 'registered') return false;
                  
                  // Neaktivni su oni s nedovoljno sati (koristimo activity_hours - tekuća i prošla godina)
                  return !isActiveMember(m.activity_hours, activityHoursThreshold);
                }).length
            }</span>
          </div>
        </div>
        <div className="text-sm text-gray-500 mt-3">
          {t('memberList.printHeader.generated')}: {formatDate(getCurrentDate(), 'dd.MM.yyyy HH:mm')}
        </div>
      </div>

      <div
        className="overflow-x-auto overflow-y-auto print:overflow-visible"
        style={{
          WebkitOverflowScrolling: "touch",
          msOverflowStyle: "none",
          scrollbarWidth: "thin",
        }}
      >
        {/* Standardna tablica za prikaz na ekranu */}
        <table className="w-full min-w-[650px] border-collapse border border-gray-300 table-fixed print:hidden">
          <colgroup>
            <col className="hidden print:table-column print:w-[10%]" />
            <col className="w-1/3 print:w-[45%]" />
            <col className="w-1/4 print:hidden" />
            <col className="w-1/6 print:w-[15%]" />
            {isSuperuser && <col className="w-1/6 print:hidden" />}
            <col className="hidden print:table-column print:w-[30%]" />
          </colgroup>
          <thead className="bg-gray-100 border-b border-gray-300 print:bg-white">
            <tr>
              <th className="hidden print:table-cell px-3 py-1 text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300 text-center">
                {t('memberTable.headers.number')}
              </th>
              <th className="px-6 py-1 text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300 text-center">
                {t('memberTable.headers.member')}
              </th>
              <th className="px-6 py-1 text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300 text-center print:hidden">
                {t('memberTable.headers.membership')}
              </th>
              <th className="px-6 py-1 text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300 text-center">
                {t('memberTable.headers.hours')}
              </th>
              {isSuperuser && (
                <th className="px-6 py-1 text-xs font-medium text-gray-700 uppercase tracking-wider text-center print:hidden">
                  {t('memberTable.headers.actions')}
                </th>
              )}
              <th className="hidden print:table-cell px-6 py-1 text-xs font-medium text-gray-700 uppercase tracking-wider text-center">
                {t('memberTable.headers.signature')}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.flatMap((group) => {
              // Odvajamo članove u dvije kategorije: aktivni i pasivni (koristimo activity_hours za status)
              const activeMembers = group.members.filter((m) => {
                return isActiveMember(m.activity_hours, activityHoursThreshold);
              });
              const inactiveMembers = group.members.filter(
                (m) => !isActiveMember(m.activity_hours, activityHoursThreshold)
              );

              let activeCounter = 1;
              let inactiveCounter = 1;

              return [
                // Group header ako nije "all"
                ...(group.key !== "all"
                  ? [
                    <tr
                      key={`group-${group.key}`}
                      className="bg-gray-100 print:hidden"
                    >
                      <td
                        colSpan={isSuperuser ? 4 : 3}
                        className="px-6 py-2 font-medium"
                      >
                        {group.title} ({group.members.length})
                      </td>
                    </tr>,
                  ]
                  : []),

                // Prvo aktivni članovi
                ...(activeMembers.length > 0
                  ? [
                    <tr key="active-header" className="hidden print:hidden">
                      <td
                        colSpan={isSuperuser ? 6 : 4}
                        className="px-6 py-2 font-medium text-center"
                      >
                        Aktivni članovi
                      </td>
                    </tr>,
                  ]
                  : []),

                // Aktivni članovi
                ...activeMembers.map((member: MemberWithDetails) => (
                  <tr
                    key={member.member_id}
                    className={`cursor-pointer transition-colors border-b border-gray-300 print:bg-white print:text-black hover:bg-gray-50`}
                    onClick={() =>
                      onViewDetails && onViewDetails(Number(member.member_id))
                    }
                  >
                    <td className={`hidden print:table-cell px-3 py-4 border-r border-gray-300 text-center ${getLifeStatusColor(member)}`}>
                      {activeCounter++}
                    </td>
                    <td className={`px-3 py-4 border-r border-gray-300 text-center ${getLifeStatusColor(member)}`}>
                      <div className="font-medium text-gray-900">
                        {member.full_name ??
                          `${member.first_name} ${member.last_name}${member.nickname ? ` - ${member.nickname}` : ""
                          }`}
                      </div>
                    </td>
                    <td className={`px-3 py-4 border-r border-gray-300 text-center print:hidden ${getLifeStatusColor(member)}`}>
                      {
                        (() => {
                          const status = getMembershipDisplayStatus(
                            member.detailedStatus,
                            !!isAdmin,
                            !!isSuperuser,
                            member.membership_type,
                            member.periods,
                            t
                          );
                          return (
                            <span
                              className={`${getMembershipStatusColor(status.key)} px-3 py-1.5 text-xs font-medium rounded-full inline-block`}
                            >
                              {status.displayText}
                            </span>
                          );
                        })()
                      }
                    </td>
                    <td className={`px-3 py-4 border-r border-gray-300 text-center ${getLifeStatusColor(member)}`}>
                      {formatMinutesToHoursAndMinutes(member.activity_hours)}
                    </td>
                    {isSuperuser && (
                      <td className={`px-3 py-4 text-center print:hidden ${getLifeStatusColor(member)}`}>
                        {renderActionButtons(member)}
                      </td>
                    )}
                    <td className={`hidden print:table-cell px-3 py-4 border-r border-gray-300 ${getLifeStatusColor(member)}`}>
                      {/* Polje za potpis */}
                    </td>
                  </tr>
                )),

                // Naslov za neaktivne članove (samo za print)
                ...(inactiveMembers.length > 0
                  ? [
                    <tr key="inactive-header-print" className="hidden print:table-row">
                      <td
                        colSpan={isSuperuser ? 6 : 4}
                        className="px-6 py-2 font-medium text-center"
                      >
                        Pasivni članovi
                      </td>
                    </tr>,
                  ]
                  : []),

                // Neaktivni članovi
                ...inactiveMembers.map((member: MemberWithDetails) => (
                  <tr
                    key={member.member_id}
                    className={`cursor-pointer transition-colors border-b border-gray-300 print:bg-white print:text-black hover:bg-gray-50`}
                    onClick={() =>
                      onViewDetails && onViewDetails(Number(member.member_id))
                    }
                  >
                    <td className={`hidden print:table-cell px-3 py-4 border-r border-gray-300 text-center ${getLifeStatusColor(member)}`}>
                      {inactiveCounter++}
                    </td>
                    <td className={`px-3 py-4 border-r border-gray-300 text-center ${getLifeStatusColor(member)}`}>
                      <div className="font-medium text-gray-900">
                        {member.full_name ??
                          `${member.first_name} ${member.last_name}${member.nickname ? ` - ${member.nickname}` : ""
                          }`}
                      </div>
                    </td>
                    <td className={`px-3 py-4 border-r border-gray-300 text-center print:hidden ${getLifeStatusColor(member)}`}>
                      {
                        (() => {
                          const status = getMembershipDisplayStatus(
                            member.detailedStatus,
                            !!isAdmin,
                            !!isSuperuser,
                            member.membership_type,
                            member.periods,
                            t
                          );
                          return (
                            <span
                              className={`${getMembershipStatusColor(status.key)} px-3 py-1.5 text-xs font-medium rounded-full inline-block`}
                            >
                              {status.displayText}
                            </span>
                          );
                        })()
                      }
                    </td>
                    <td className={`px-3 py-4 border-r border-gray-300 text-center ${getLifeStatusColor(member)}`}>
                      {formatMinutesToHoursAndMinutes(member.activity_hours)}
                    </td>
                    {isSuperuser && (
                      <td className={`px-3 py-4 text-center print:hidden ${getLifeStatusColor(member)}`}>
                        {renderActionButtons(member)}
                      </td>
                    )}
                    <td className={`hidden print:table-cell px-3 py-4 border-r border-gray-300 ${getLifeStatusColor(member)}`}>
                      {/* Polje za potpis */}
                    </td>
                  </tr>
                )),
              ];
            })}
          </tbody>
        </table>

        {/* Posebna tablica samo za printanje, bez kompleksne strukture */}
        <table className="hidden print:!table w-full min-w-[650px] border-collapse border border-gray-300 table-fixed print-table">
          <colgroup>
            <col className="w-[10%]" />
            <col className="w-[45%]" />
            <col className="w-[15%]" />
            <col className="w-[30%]" />
          </colgroup>
          <thead className="bg-white border-b border-gray-300">
            <tr>
              <th className="px-3 py-1 text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300 text-center">
                BR.
              </th>
              <th className="px-6 py-1 text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300 text-center">
                ČLAN
              </th>
              <th className="px-6 py-1 text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300 text-center">
                SATI
              </th>
              <th className="px-6 py-1 text-xs font-medium text-gray-700 uppercase tracking-wider text-center">
                POTPIS
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Aktivni članovi */}
            {filteredMembers
              .flatMap((group) => {
                // Prvo izdvojimo sve aktivne članove iz svih grupa
                // Koristimo total_hours (prošla + tekuća godina) i provjeravamo status 'registered'
                const activeMembers = group.members.filter((m) => {
                  // Samo registrirani članovi mogu biti na listi
                  if (m.detailedStatus?.status !== 'registered') return false;
                  
                  // Aktivni su oni s dovoljno sati (koristimo activity_hours - tekuća i prošla godina)
                  return isActiveMember(m.activity_hours, activityHoursThreshold);
                });
                return activeMembers;
              })
              .map((member, index) => (
                <tr
                  key={`print-active-${member.member_id}`}
                  className="border-b border-gray-300 bg-white"
                >
                  <td className="px-3 py-4 border-r border-gray-300 text-center">
                    {index + 1}
                  </td>
                  <td className="px-3 py-4 border-r border-gray-300 text-center">
                    <div className="font-medium text-gray-900">
                      {member.full_name ??
                        `${member.first_name} ${member.last_name}${member.nickname ? ` - ${member.nickname}` : ""
                        }`}
                    </div>
                  </td>
                  <td className="px-3 py-4 border-r border-gray-300 text-center">
                    {formatMinutesToHoursAndMinutes(member.activity_hours)}
                  </td>
                  <td className="px-3 py-4 border-r border-gray-300">
                    {/* Polje za potpis - dodaj oznaku za maloljetne */}
                    {(() => {
                      if (!member.date_of_birth) return '';
                      
                      const today = new Date();
                      const birthDate = new Date(member.date_of_birth);
                      let age = today.getFullYear() - birthDate.getFullYear();
                      const monthDiff = today.getMonth() - birthDate.getMonth();
                      
                      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                        age--;
                      }
                      
                      return age < 18 ? <div className="text-xs text-gray-500">maloljetan</div> : '';
                    })()}
                  </td>
                </tr>
              ))}

            {/* Naslov za neaktivne članove */}
            <tr className="bg-gray-100">
              <td colSpan={4} className="px-6 py-2 font-medium text-center">
                Pasivni članovi
              </td>
            </tr>

            {/* Neaktivni članovi */}
            {filteredMembers
              .flatMap((group) => {
                // Zatim izdvojimo sve neaktivne članove iz svih grupa
                // Koristimo total_hours (prošla + tekuća godina) i provjeravamo status 'registered'
                const inactiveMembers = group.members.filter((m) => {
                  // Samo registrirani članovi mogu biti na listi
                  if (m.detailedStatus?.status !== 'registered') return false;
                  
                  // Neaktivni su oni s nedovoljno sati (koristimo activity_hours - tekuća i prošla godina)
                  return !isActiveMember(m.activity_hours, activityHoursThreshold);
                });
                return inactiveMembers;
              })
              .map((member, index) => (
                <tr
                  key={`print-inactive-${member.member_id}`}
                  className="border-b border-gray-300 bg-white"
                >
                  <td className="px-3 py-4 border-r border-gray-300 text-center">
                    {index + 1}
                  </td>
                  <td className="px-3 py-4 border-r border-gray-300 text-center">
                    <div className="font-medium text-gray-900">
                      {member.full_name ??
                        `${member.first_name} ${member.last_name}${member.nickname ? ` - ${member.nickname}` : ""
                        }`}
                    </div>
                  </td>
                  <td className="px-3 py-4 border-r border-gray-300 text-center">
                    {formatMinutesToHoursAndMinutes(member.activity_hours)}
                  </td>
                  <td className="px-3 py-4 border-r border-gray-300">
                    {/* Polje za potpis - dodaj oznaku za maloljetne */}
                    {(() => {
                      if (!member.date_of_birth) return '';
                      
                      const today = new Date();
                      const birthDate = new Date(member.date_of_birth);
                      let age = today.getFullYear() - birthDate.getFullYear();
                      const monthDiff = today.getMonth() - birthDate.getMonth();
                      
                      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                        age--;
                      }
                      
                      return age < 18 ? <div className="text-xs text-gray-500">maloljetan</div> : '';
                    })()}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default MemberTable;
