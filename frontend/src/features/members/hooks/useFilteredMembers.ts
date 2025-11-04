import { useState, useEffect } from 'react';
import { MemberWithDetails } from '@shared/memberDetails.types';
import { hasActiveMembershipPeriod } from '@shared/memberStatus.types';
import { getCurrentDate, getCurrentYear, getMonth, getDate, getYearForPaymentCheck } from '../../../utils/dateUtils';
import { parseISO } from 'date-fns';
import { getMembershipDisplayStatusExternal } from '../components/memberTableUtils';
import { useSystemSettings } from '../../../hooks/useSystemSettings';
import { isActiveMember } from '../../../utils/activityStatusHelpers';

interface UseFilteredMembersProps {
  members: MemberWithDetails[];
  searchTerm: string;
  activeFilter: "regular" | "active" | "passive" | "paid" | "unpaid" | "all"| "pending";
  ageFilter: "all" | "adults";
  sortCriteria: "name" | "hours";
  sortOrder: "asc" | "desc";
  groupByType: boolean;
  /** Omogući pretragu po osjetljivim poljima (OIB, telefon, email) za ovlaštene uloge */
  enableSensitiveSearch?: boolean;
}

/**
 * Custom hook za filtriranje i sortiranje članova
 */
export const useFilteredMembers = ({ 
  members,
  searchTerm,
  activeFilter,
  ageFilter,
  sortCriteria,
  sortOrder,
  groupByType,
  enableSensitiveSearch = false
}: UseFilteredMembersProps) => {
  const [filteredMembers, setFilteredMembers] = useState<MemberWithDetails[]>(members);
  const { systemSettings } = useSystemSettings();
  
  // Dohvati activity hours threshold iz system settings (default 20)
  const activityHoursThreshold = systemSettings?.activityHoursThreshold ?? 20;

  // Primijeni filtere i sortiranje kad se promijene ulazni podaci ili postavke filtera
  useEffect(() => {
    let result = [...members];
    
    // Apply search filter
    if (searchTerm) {
      const termLower = searchTerm.toLowerCase();
      result = result.filter(member => {
        const nameMatch = (member.full_name ?? `${member.first_name} ${member.last_name}`)
          .toLowerCase()
          .includes(termLower);

        if (nameMatch) return true;

        if (enableSensitiveSearch) {
          const oibMatch = member.oib?.includes(searchTerm) ?? false;
          const phoneMatch = member.cell_phone?.includes(searchTerm) ?? false;
          const emailMatch = member.email?.toLowerCase().includes(termLower) ?? false;
          return oibMatch || phoneMatch || emailMatch;
        }

        return false;
      });
    }
    
    
    // Apply active/passive filter
    if (activeFilter !== "all") {
      if (activeFilter === "regular") {
        // Filtriraj redovne članove s obojenim retcima (ista logika kao stari "Obojani" gumb)
        result = result.filter(member => {
          // Dohvati status člana
          const status = getMembershipDisplayStatusExternal(
            member.detailedStatus,
            false, // isAdmin
            false, // isSuperuser
            member.membership_type,
            member.periods
          );

          // Samo za redovne članove primijeni bojanje prema životnom statusu
          if (status.key === 'regularMember') {
            const lifeStatus = member.life_status;

            // Vrati true ako član ima životni status koji rezultira bojanjem
            return (
              lifeStatus === "employed/unemployed" ||
              lifeStatus === "child/pupil/student" ||
              lifeStatus === "pensioner"
            );
          }

          return false;
        });
      }
      else if (activeFilter === "active" || activeFilter === "passive") {
        const isActive = activeFilter === "active";
        result = result.filter(member => {
          // Logika za filtriranje mora biti identična logici za prikaz (getMembershipDisplayStatusExternal)
          // Član je kandidat za aktivnog/pasivnog samo ako NIJE 'Bivši član'.

          const isFormerMember = member.detailedStatus?.status === 'inactive' || 
                                 (member.periods && !hasActiveMembershipPeriod(member.periods));

          if (isFormerMember || member.detailedStatus?.status === 'pending') {
            return false; // Izbaci bivše članove i one na čekanju
          }

          // Koristimo activity_hours (sati iz tekuće i prošle godine)
          const memberIsActive = isActiveMember(member.activity_hours, activityHoursThreshold);
          return isActive ? memberIsActive : !memberIsActive;
        });
      } 
      else if (activeFilter === "paid") {
        // Filtriraj članove koji su platili članarinu
        // getYearForPaymentCheck() vraća mock godinu ako je mock postavljen (za testiranje),
        // inače vraća stvarnu godinu (za produkciju)
        const yearToCheck = getYearForPaymentCheck();
        result = result.filter(member => 
          member.feeStatus === 'current' || 
          (member.membership_details?.fee_payment_year === yearToCheck)
        );
      } 
      else if (activeFilter === "unpaid") {
        // Filtriraj članove koji nisu platili članarinu
        // getYearForPaymentCheck() vraća mock godinu ako je mock postavljen (za testiranje),
        // inače vraća stvarnu godinu (za produkciju)
        const yearToCheck = getYearForPaymentCheck();
        result = result.filter(member => 
          member.feeStatus === 'payment required' || 
          (!member.membership_details?.fee_payment_year || member.membership_details.fee_payment_year < yearToCheck)
        );
      }
      else if (activeFilter === "pending") {
        result = result.filter(member => member.detailedStatus?.status === 'pending');
      }
    }
    
    // Apply age filter - samo punoljetni (18+)
    if (ageFilter === "adults") {
      const today = getCurrentDate();
      result = result.filter(member => {
        // Provjeri da li datum rođenja postoji
        if (!member.date_of_birth) return false;
        
        // Pretvori string datuma u Date objekt
        const birthDate = parseISO(member.date_of_birth);
        
        // Izračunaj dob u godinama
        let age = getCurrentYear() - birthDate.getFullYear();
        const monthDiff = getMonth(today) - getMonth(birthDate);
        
        // Prilagodi godine ako rođendan još nije prošao ove godine
        if (monthDiff < 0 || (monthDiff === 0 && getDate(today) < getDate(birthDate))) {
          age--;
        }
        
        return age >= 18;
      });
    }
    
    // Apply sorting
    if (sortCriteria === "name") {
      result.sort((a, b) => {
        const nameA = a.full_name ?? `${a.first_name} ${a.last_name}`;
        const nameB = b.full_name ?? `${b.first_name} ${b.last_name}`;
        return sortOrder === "asc" 
          ? nameA.localeCompare(nameB, 'hr') 
          : nameB.localeCompare(nameA, 'hr');
      });
    } else if (sortCriteria === "hours") {
      result.sort((a, b) => {
        const hoursA = a.activity_hours ?? 0;
        const hoursB = b.activity_hours ?? 0;
        return sortOrder === "asc" 
          ? hoursA - hoursB 
          : hoursB - hoursA;
      });
    }
    
    setFilteredMembers(result);
  }, [members, searchTerm, activeFilter, ageFilter, sortCriteria, sortOrder, activityHoursThreshold, enableSensitiveSearch]);

  const groupMembersByType = groupByType ? 
    filteredMembers.reduce((groups, member) => {
      const type = member.membership_type ?? 'unknown';
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(member);
      return groups;
    }, {} as Record<string, MemberWithDetails[]>) 
    : null;

  return { 
    filteredMembers, 
    groupMembersByType 
  };
};
