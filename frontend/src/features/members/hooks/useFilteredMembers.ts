import { useState, useEffect } from 'react';
import { MemberWithDetails } from '@shared/memberDetails.types';
import { getCurrentDate, getCurrentYear, getMonth, getDate } from '../../../utils/dateUtils';
import { parseISO } from 'date-fns';

interface UseFilteredMembersProps {
  members: MemberWithDetails[];
  searchTerm: string;
  activeFilter: "all" | "active" | "passive" | "paid" | "unpaid" | "pending";
  ageFilter: "all" | "adults";
  sortCriteria: "name" | "hours";
  sortOrder: "asc" | "desc";
  groupByType: boolean;
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
  groupByType
}: UseFilteredMembersProps) => {
  const [filteredMembers, setFilteredMembers] = useState<MemberWithDetails[]>(members);

  // Primijeni filtere i sortiranje kad se promijene ulazni podaci ili postavke filtera
  useEffect(() => {
    let result = [...members];
    
    // Apply search filter
    if (searchTerm) {
      result = result.filter(member => 
        member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ??
        `${member.first_name} ${member.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ??
        member.oib?.includes(searchTerm)
      );
    }
    
    
    // Apply active/passive filter
    if (activeFilter !== "all") {
      if (activeFilter === "active" || activeFilter === "passive") {
        const isActive = activeFilter === "active";
        // Aktivni su članovi koji imaju 20 ili više sati aktivnosti
        const requiredHoursForActive = 20 * 60; // 20 sati u minutama
        result = result.filter(member => {
          const totalHours = member.total_hours ?? 0;
          return isActive ? (totalHours >= requiredHoursForActive) : (totalHours < requiredHoursForActive);
        });
      } 
      else if (activeFilter === "paid") {
        // Filtriraj članove koji su platili članarinu (feeStatus je 'current' ili fee_payment_year odgovara trenutnoj godini)
        const currentYear = getCurrentYear();
        result = result.filter(member => 
          member.feeStatus === 'current' || 
          (member.membership_details?.fee_payment_year === currentYear)
        );
      } 
      else if (activeFilter === "unpaid") {
        // Filtriraj članove koji nisu platili članarinu
        const currentYear = getCurrentYear();
        result = result.filter(member => 
          member.feeStatus === 'payment required' || 
          (!member.membership_details?.fee_payment_year || member.membership_details.fee_payment_year < currentYear)
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
        const hoursA = a.total_hours ?? 0;
        const hoursB = b.total_hours ?? 0;
        return sortOrder === "asc" 
          ? hoursA - hoursB 
          : hoursB - hoursA;
      });
    }
    
    setFilteredMembers(result);
  }, [members, searchTerm, activeFilter, ageFilter, sortCriteria, sortOrder]);

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
