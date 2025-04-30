import React from 'react';
import { MemberWithDetails } from '../interfaces/memberTypes';
import { DetailedMembershipStatus, getMembershipStatusDescription, findLastEndedPeriod, hasActiveMembershipPeriod, MembershipPeriod } from '@shared/memberStatus.types';
import { formatDate } from '../../../utils/dateUtils';
import { Button } from '@components/ui/button';
import { Eye, Edit, Trash2, UserCog, Key, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Badge } from '@components/ui/badge';
import { Member } from '@shared/member';

// Funkcija za filtriranje članova s obojenim retcima
export function filterOnlyColoredRows(members: MemberWithDetails[]) {
  return members.filter(member => {
    // Dohvati status člana
    const displayStatus = getMembershipDisplayStatusExternal(
      member.detailedStatus, 
      false, // isAdmin
      false, // isSuperuser
      member.membership_type, 
      member.periods
    );
    
    // Samo za redovne članove primijeni bojanje prema životnom statusu
    if (displayStatus === 'Redovni član') {
      const lifeStatus = member.life_status;
      
      // Vrati true ako član ima životni status koji rezultira bojanjem
      return lifeStatus === "employed/unemployed" ||
             lifeStatus === "child/pupil/student" ||
             lifeStatus === "pensioner";
    }
    
    return false;
  });
}

// Funkcija za filtriranje članova koji imaju člansku iskaznicu
export function filterOnlyWithCardNumber(members: MemberWithDetails[]) {
  return members.filter(member => 
    member.cardDetails?.card_number !== undefined && 
    member.cardDetails?.card_number !== null && 
    member.cardDetails?.card_number !== ''
  );
}

// Helper funkcija za vanjsko određivanje statusa članstva bez pristupa komponentnim stanjima
export function getMembershipDisplayStatusExternal(
  detailedStatus: DetailedMembershipStatus | undefined,
  isAdmin: boolean,
  isSuperuser: boolean,
  membershipType?: string,
  periods?: MembershipPeriod[]
): string {
  if (!detailedStatus) return '';

  if (periods && !hasActiveMembershipPeriod(periods)) {
    const lastEnded = findLastEndedPeriod(periods);
    if (lastEnded) return 'Bivši član';
  }

  if (detailedStatus.status === 'pending') {
    return 'Na čekanju';
  }
  if (detailedStatus.status === 'registered' && membershipType === 'regular') {
    return 'Redovni član';
  }
  if (detailedStatus.status === 'registered' && membershipType === 'honorary') {
    return 'Počasni član';
  }
  if (detailedStatus.status === 'registered' && membershipType === 'supporting') {
    return 'Podržavajući član';
  }
  if (detailedStatus.status === 'inactive') {
    return 'Bivši član';
  }
  return '';
}

interface MemberTableProps {
  filteredMembers: {
    key: string;
    title: string;
    members: MemberWithDetails[];
  }[];
  isAdmin?: boolean;
  isSuperuser?: boolean;
  onViewDetails?: (memberId: number) => void;
  onEditMember?: (member: Member) => void;
  onDeleteMember?: (member: Member) => void;
  onAssignPassword?: (member: Member) => void;
  onAssignRole?: (member: Member) => void;
  setFilteredMembers?: React.Dispatch<React.SetStateAction<any[]>>;
  refreshMembers?: () => void;
  hideTableHeader?: boolean; // Novi prop za skrivanje zaglavlja tablice
}

// Komponenta za prikaz tablice članova
export const MemberTable: React.FC<MemberTableProps> = ({
  filteredMembers,
  isAdmin,
  isSuperuser,
  onViewDetails,
  onEditMember,
  onDeleteMember,
  onAssignPassword,
  onAssignRole,
  setFilteredMembers,
  refreshMembers,
  hideTableHeader
}) => {
  // Pomoćna funkcija za određivanje boje statusa članstva 
  // Bazirana na originalnoj implementaciji iz MemberList.tsx
  const getMembershipStatusColor = (displayStatus: string): string => {
    switch (displayStatus) {
      case 'Redovni član':
      case 'Počasni član':
      case 'Podržavajući član':
        return 'text-green-700 bg-green-100';
      case 'Bivši član':
        return 'text-red-700 bg-red-100';
      case 'Na čekanju':
        return 'text-yellow-700 bg-yellow-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };
  
  // Funkcija za dobivanje boje na temelju life_status
  const getLifeStatusColor = (member: MemberWithDetails) => {
    // Zadana boja za hover efekt
    let baseClass = "hover:bg-gray-50";
    
    // Dohvati status člana
    const displayStatus = getMembershipDisplayStatus(
      member.detailedStatus, 
      !!isAdmin, 
      !!isSuperuser, 
      member.membership_type, 
      member.periods
    );
    
    // Samo za redovne članove primijeni bojanje prema životnom statusu
    if (displayStatus === 'Redovni član') {
      const lifeStatus = member.life_status;
      
      switch (lifeStatus) {
        case "employed/unemployed":
          baseClass = "bg-blue-50 hover:bg-blue-100";
          break;
        case "child/pupil/student":
          baseClass = "bg-green-50 hover:bg-green-100";
          break;
        case "pensioner":
          baseClass = "bg-red-50 hover:bg-red-100";
          break;
      }
    }
    
    return baseClass;
  };

  // Funkcija koja provjerava je li redak stvarno obojan (ne koristi status člana već stvarnu boju)
  const isRowColored = (member: MemberWithDetails) => {
    const colorClass = getLifeStatusColor(member);
    return colorClass.includes("bg-blue-50") || 
           colorClass.includes("bg-green-50") || 
           colorClass.includes("bg-red-50");
  };

  // Helper funkcija za prikaz statusa u koloni ČLANSTVO
  function getMembershipDisplayStatus(
    detailedStatus: DetailedMembershipStatus | undefined,
    isAdmin: boolean,
    isSuperuser: boolean,
    membershipType?: string,
    periods?: MembershipPeriod[]
  ): string {
    return getMembershipDisplayStatusExternal(
      detailedStatus,
      isAdmin,
      isSuperuser,
      membershipType,
      periods
    );
  }

  const renderActionButtons = (member: MemberWithDetails) => {
    // Dohvati status člana
    const displayStatus = getMembershipDisplayStatus(
      member.detailedStatus, 
      !!isAdmin, 
      !!isSuperuser, 
      member.membership_type, 
      member.periods
    );
    
    return (
      <div className="flex justify-center space-x-1" style={{ minWidth: '120px' }}>
        <div style={{ width: '32px', textAlign: 'center' }}>
          {displayStatus === 'Na čekanju' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onAssignPassword && onAssignPassword(member);
              }}
              title="Assign number"
            >
              <Key className="w-4 h-4" />
            </Button>
          )}
        </div>
        <div style={{ width: '32px', textAlign: 'center' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteMember && onDeleteMember(member);
            }}
            title="Delete member"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        <div style={{ width: '32px', textAlign: 'center' }}>
          {isSuperuser && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onAssignRole && onAssignRole(member);
              }}
              title="Manage role"
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
      <div className="overflow-x-auto overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none', scrollbarWidth: 'thin' }}>
        <table className="w-full min-w-[650px] border-collapse border border-gray-200 table-fixed">
          <colgroup>
            <col className="hidden print:table-column print:w-[10%]" /> {/* Redni broj - samo za print */}
            <col className="w-1/3 print:w-[45%]" /> {/* Vraćamo originalnu širinu za ČLAN kolonu u normalnom prikazu */}
            <col className="w-1/4 print:hidden" />
            <col className="w-1/6 print:w-[15%]" />
            {isSuperuser && <col className="w-1/6 print:hidden" />}
            <col className="hidden print:table-column print:w-[30%]" /> {/* Kolona za potpis - samo za print */}
          </colgroup>
          <thead className="bg-gray-100 border-b border-gray-200 print:bg-white">
            <tr>
              <th className="hidden print:table-cell px-3 py-1 text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200 text-center">
                BR.
              </th>
              <th className="px-6 py-1 text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200 text-center">
                ČLAN
              </th>
              <th className="px-6 py-1 text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200 text-center print:hidden">
                ČLANSTVO
              </th>
              <th className="px-6 py-1 text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200 text-center">
                SATI
              </th>
              {isSuperuser && (
                <th className="px-6 py-1 text-xs font-medium text-gray-700 uppercase tracking-wider text-center print:hidden">
                  AKCIJE
                </th>
              )}
              <th className="hidden print:table-cell px-6 py-1 text-xs font-medium text-gray-700 uppercase tracking-wider text-center">
                POTPIS
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.flatMap(group => {
              // Odvajamo članove u dvije kategorije: ≥20 sati i <20 sati
              const activeMembers = group.members.filter(m => Number(m.total_hours) >= 20);
              const inactiveMembers = group.members.filter(m => Number(m.total_hours) < 20);
              
              let activeCounter = 1;
              let inactiveCounter = 1;

              return [
                // Group header ako nije "all"
                ...(group.key !== 'all' ? [
                  <tr key={`group-${group.key}`} className="bg-gray-100 print:hidden">
                    <td colSpan={isSuperuser ? 4 : 3} className="px-6 py-2 font-medium">
                      {group.title} ({group.members.length})
                    </td>
                  </tr>
                ] : []),
                
                // Prvo aktivni članovi
                ...(activeMembers.length > 0 ? [
                  <tr key="active-header" className="hidden">
                    <td colSpan={4} className="px-6 py-2 font-medium text-center">
                      Aktivni članovi
                    </td>
                  </tr>
                ] : []),
                
                // Aktivni članovi
                ...activeMembers.map((member: MemberWithDetails) => (
                  <tr 
                    key={member.member_id} 
                    className={`${getLifeStatusColor(member)} cursor-pointer transition-colors border-b border-gray-200 print:bg-white print:text-black`}
                    onClick={() => onViewDetails && onViewDetails(Number(member.member_id))}
                  >
                    <td className="hidden print:table-cell px-3 py-4 border-r border-gray-200 text-center">
                      {activeCounter++}
                    </td>
                    <td className="px-3 py-4 border-r border-gray-200 text-center">
                      <div className="font-medium text-gray-900">
                        {member.full_name || `${member.first_name} ${member.last_name}`}
                      </div>
                    </td>
                    <td className="px-3 py-4 border-r border-gray-200 text-center print:hidden">
                      <span className={`${getMembershipStatusColor(getMembershipDisplayStatus(member.detailedStatus, !!isAdmin, !!isSuperuser, member.membership_type, member.periods))} px-3 py-1.5 text-xs font-medium rounded-full inline-block`}>
                        {getMembershipDisplayStatus(member.detailedStatus, !!isAdmin, !!isSuperuser, member.membership_type, member.periods)}
                      </span>
                    </td>
                    <td className="px-3 py-4 border-r border-gray-200 text-center">
                      {member.total_hours || 0}
                    </td>
                    {isSuperuser && (
                      <td className="px-3 py-4 text-center print:hidden">
                        {renderActionButtons(member)}
                      </td>
                    )}
                    <td className="hidden print:table-cell px-3 py-4 border-r border-gray-200">
                      {/* Polje za potpis */}
                    </td>
                  </tr>
                )),
                
                // Naslov za neaktivne članove (samo za print)
                ...(inactiveMembers.length > 0 ? [
                  <tr key="inactive-header" className="hidden">
                    <td colSpan={4} className="px-6 py-2 font-medium text-center">
                      Neaktivni članovi
                    </td>
                  </tr>
                ] : []),
                
                // Neaktivni članovi
                ...inactiveMembers.map((member: MemberWithDetails) => (
                  <tr 
                    key={member.member_id} 
                    className={`${getLifeStatusColor(member)} cursor-pointer transition-colors border-b border-gray-200 print:bg-white print:text-black`}
                    onClick={() => onViewDetails && onViewDetails(Number(member.member_id))}
                  >
                    <td className="hidden print:table-cell px-3 py-4 border-r border-gray-200 text-center">
                      {inactiveCounter++}
                    </td>
                    <td className="px-3 py-4 border-r border-gray-200 text-center">
                      <div className="font-medium text-gray-900">
                        {member.full_name || `${member.first_name} ${member.last_name}`}
                      </div>
                    </td>
                    <td className="px-3 py-4 border-r border-gray-200 text-center print:hidden">
                      <span className={`${getMembershipStatusColor(getMembershipDisplayStatus(member.detailedStatus, !!isAdmin, !!isSuperuser, member.membership_type, member.periods))} px-3 py-1.5 text-xs font-medium rounded-full inline-block`}>
                        {getMembershipDisplayStatus(member.detailedStatus, !!isAdmin, !!isSuperuser, member.membership_type, member.periods)}
                      </span>
                    </td>
                    <td className="px-3 py-4 border-r border-gray-200 text-center">
                      {member.total_hours || 0}
                    </td>
                    {isSuperuser && (
                      <td className="px-3 py-4 text-center print:hidden">
                        {renderActionButtons(member)}
                      </td>
                    )}
                    <td className="hidden print:table-cell px-3 py-4 border-r border-gray-200">
                      {/* Polje za potpis */}
                    </td>
                  </tr>
                ))
              ];
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default MemberTable;
