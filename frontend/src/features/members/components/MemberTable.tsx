import React from 'react';
import { MemberWithDetails } from '../interfaces/memberTypes';
import { DetailedMembershipStatus, getMembershipStatusDescription } from '@shared/memberStatus.types';
import { formatDate } from '../../../utils/dateUtils';
import { Button } from '@components/ui/button';
import { Eye, Edit, Trash2, UserCog, Key, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Badge } from '@components/ui/badge';
import { Member } from '@shared/member';

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
  onAssignRole
}) => {
  // Pomoćna funkcija za određivanje boje statusa članstva 
  // Bazirana na originalnoj implementaciji iz MemberList.tsx
  const getMembershipStatusColor = (status: string | DetailedMembershipStatus): string => {
    // Ako je status DetailedMembershipStatus objekt, izvuci stvarni status
    const actualStatus = typeof status === 'string' ? status : status.status;
    
    switch (actualStatus) {
      case 'registered':
        return 'text-green-700 bg-green-100';
      case 'inactive':
        return 'text-red-700 bg-red-100';
      case 'pending':
        return 'text-yellow-700 bg-yellow-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };
  
  // Funkcija za dobivanje boje na temelju life_status
  const getLifeStatusColor = (member: MemberWithDetails) => {
    // Provjeri prvo je li markica izdana
    const stampIssued = member.cardDetails?.card_stamp_issued;
    
    // Ako markica nije izdana, samo hover efekt bez bojanja
    if (!stampIssued) {
      return "hover:bg-gray-50";
    }
    
    // Inače, oboji ovisno o life_status
    const lifeStatus = member.life_status;
    
    switch (lifeStatus) {
      case "employed/unemployed":
        return "bg-blue-50 hover:bg-blue-100";
      case "child/pupil/student":
        return "bg-green-50 hover:bg-green-100";
      case "pensioner":
        return "bg-red-50 hover:bg-red-100";
      default:
        return "hover:bg-gray-50";
    }
  };

  const renderActionButtons = (member: MemberWithDetails) => {
    return (
      <div className="flex justify-center space-x-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails && onViewDetails(Number(member.member_id));
          }}
          title="View details"
        >
          <Eye className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onEditMember && onEditMember(member);
          }}
          title="Edit member"
        >
          <Edit className="w-4 h-4" />
        </Button>
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
    );
  };

  return (
    <>
      {filteredMembers.map(group => (
        <div key={group.key} className="mb-4">
          {group.key !== 'all' && (
            <div className="px-6 py-3 bg-gray-100 font-medium">
              {group.title} ({group.members.length})
            </div>
          )}
          
          <table className="w-full text-left">
            {(group.key === filteredMembers[0].key) && (
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                    Name
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                    KATEGORIJA
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                    Hours
                  </th>
                  {isAdmin && (
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-gray-200">
              {group.members.map((member: MemberWithDetails) => (
                <tr 
                  key={member.member_id} 
                  className={`${getLifeStatusColor(member)} cursor-pointer transition-colors`}
                  onClick={() => onViewDetails && onViewDetails(Number(member.member_id))}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div>
                        <div className="font-medium text-gray-900">
                          {member.full_name || `${member.first_name} ${member.last_name}`}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full text-sm ${getMembershipStatusColor(member.membershipStatus)}`}
                      title={member.detailedStatus?.reason || ''}
                    >
                    {member.membershipStatus === 'registered' ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : member.membershipStatus === 'inactive' ? (
                      <XCircle className="w-4 h-4" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    {member.membershipStatus === 'registered' ? "Članstvo važeće" : member.membershipStatus === 'inactive' ? 'Neaktivan' : 'Na čekanju'}
                    
                    {/* Dodatni detalji ako postoje */}
                    {member.detailedStatus?.endReason && (
                      <span className="ml-1 text-xs opacity-75">({member.detailedStatus.endReason})</span>
                    )}
                    </span>
                    
                    {/* Razlog statusa ako postoji i ako treba biti prikazan */}
                    {member.detailedStatus?.reason && member.detailedStatus.reason !== getMembershipStatusDescription(member.membershipStatus) && (
                      <div className="text-xs text-gray-500 mt-1">{member.detailedStatus.reason}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Badge variant="outline" className="font-mono">{member.total_hours || 0}</Badge>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 text-center print:hidden">
                      {renderActionButtons(member)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </>
  );
};

export default MemberTable;
