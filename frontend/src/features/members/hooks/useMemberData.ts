import { useState, useEffect } from 'react';
import api from '../../../utils/api';
import { Member } from '@shared/member';
import { 
  adaptMembershipPeriods, 
  determineMemberActivityStatus, 
  hasPaidMembershipFee,
  determineDetailedMembershipStatus,
  determineFeeStatus,
  DetailedMembershipStatus
} from '@shared/memberStatus.types';
import { MemberWithDetails, MemberCardDetails } from '../interfaces/memberTypes';
import { useToast } from "@components/ui/use-toast";

/**
 * Custom hook za dohvaćanje i manipulaciju podataka o članovima
 * Izdvaja logiku iz komponente u zaseban hook za bolju održivost
 */
export const useMemberData = () => {
  const { toast } = useToast();
  const [members, setMembers] = useState<MemberWithDetails[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<MemberWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Funkcija za ponovno učitavanje podataka
  const refreshMembers = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Funkcija za dodavanje novog člana
  const addMember = async (newMember: Member) => {
    try {
      await api.post('/members', newMember);
      toast({
        title: "Success",
        description: "Member added successfully",
      });
      refreshMembers();
      return true;
    } catch (error) {
      console.error('Error adding member:', error);
      toast({
        title: "Error",
        description: "Failed to add member",
        variant: "destructive",
      });
      return false;
    }
  };

  // Funkcija za uređivanje člana
  const updateMember = async (memberId: string, updatedMember: Partial<Member>) => {
    try {
      await api.patch(`/members/${memberId}`, updatedMember);
      toast({
        title: "Success",
        description: "Member updated successfully",
      });
      refreshMembers();
      return true;
    } catch (error) {
      console.error('Error updating member:', error);
      toast({
        title: "Error",
        description: "Failed to update member",
        variant: "destructive",
      });
      return false;
    }
  };

  // Funkcija za brisanje člana
  const deleteMember = async (memberId: string) => {
    try {
      await api.delete(`/members/${memberId}`);
      toast({
        title: "Success",
        description: "Member deleted successfully",
      });
      refreshMembers();
      return true;
    } catch (error) {
      console.error('Error deleting member:', error);
      toast({
        title: "Error",
        description: "Failed to delete member",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    const fetchMembers = async (): Promise<void> => {
      try {
        setLoading(true);
        // Dodaj vremenski žig kao query parametar da bi se zaobišlo keširanje
        const timestamp = new Date().getTime();
        const response = await api.get<Member[]>(`/members?t=${timestamp}`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        const membersData = response.data;

        // Osiguraj da svi članovi imaju pravilno formatirano puno ime s nadimkom
        const processedMembers = membersData.map(member => {
          // Ako full_name već nije postavljen, generiraj ga s nadimkom
          if (!member.full_name && member.first_name && member.last_name) {
            member.full_name = `${member.first_name} ${member.last_name}${
              member.nickname ? ` - ${member.nickname}` : ''}`;
          }
          return member;
        });

        // Koristi podatke koji su već dostupni u osnovnim podacima o članu
        const membersWithDetails = processedMembers.map(member => {
          // Koristi centraliziranu funkciju za određivanje aktivnosti člana
          const isActive = determineMemberActivityStatus(member) === 'active';
          
          // Koristi centraliziranu funkciju za određivanje statusa članstva
          // Napomena: Ne možemo ovdje koristiti determineMembershipStatus jer nemamo periods podatke
          // To će se ažurirati kasnije kad dohvatimo detalje članova
          const rawStatus = member.status as string;
          // Prepoznaj "active" status iz baze podataka kao "registered" za konzistentnost prikaza
          let membershipStatus = rawStatus === 'active' ? 'registered' : (member.status || 'pending');
          
          // Provjeri plaćenu članarinu koristeći centraliziranu funkciju
          const hasPaidFee = hasPaidMembershipFee(member);
          
          return {
            ...member,
            cardDetails: {
              card_number: member.card_number || member.membership_details?.card_number,
              stamp_type: member.life_status as any, // Koristi life_status kao tip markice
              card_stamp_issued: false, // Default value, will be updated later
              fee_payment_year: member.fee_payment_year || member.membership_details?.fee_payment_year
            },
            isActive,
            membershipStatus: membershipStatus
          };
        });

        setMembers(membersWithDetails);
        setFilteredMembers(membersWithDetails);
        setError(null);
        
        // Now fetch detailed membership information for each member
        const fetchMembershipDetails = async () => {
          try {
            const memberDetailsPromises = membersWithDetails.map(async (member) => {
              try {
                // Pravilno adaptiraj periods bez obzira na backend strukturu
                const periods = Array.isArray(member.membership_history)
                  ? member.membership_history
                  : (member.membership_history?.periods || []);
                const adaptedPeriods = adaptMembershipPeriods(periods);
                // Izračunaj detaljan status članstva
                const detailedStatus = determineDetailedMembershipStatus(
                  member, 
                  adaptedPeriods
                );
                // Izračunaj status plaćanja članarine
                const feeStatus = determineFeeStatus({
                  membership_details: {
                    fee_payment_year: member.cardDetails?.fee_payment_year || 0
                  }
                });
                return {
                  ...member,
                  periods: adaptedPeriods,
                  detailedStatus,
                  feeStatus,
                  membershipStatus: detailedStatus.status
                };
              } catch (error) {
                console.error(`Failed to fetch details for member ${member.member_id}:`, error);
                return member;
              }
            });
            
            const updatedMembers = await Promise.all(memberDetailsPromises);
            setMembers(updatedMembers);
            setFilteredMembers(updatedMembers);
          } catch (error) {
            console.error("Error fetching member details:", error);
          } finally {
            setLoading(false);
          }
        };
        
        fetchMembershipDetails();
      } catch (error: any) {
        console.error("Error fetching members:", error);
        setError(error.message || "Failed to load members");
        setLoading(false);
      }
    };

    fetchMembers();
  }, [refreshTrigger]);

  // Ako window postoji, dodaj CSS za ispis
  if (typeof window !== 'undefined') {
    useEffect(() => {
      // Dodavanje stila za sakrivanje elemenata pri printanju
      const style = document.createElement('style');
      style.innerHTML = `
        @media print {
          /* Sakrivanje navigacije i drugih elemenata */
          nav, 
          .print-hide, 
          header, 
          button:not(.print-show),
          [role="tablist"],
          [role="tab"],
          .filter-section {
            display: none !important;
          }
          
          /* Elementi koji trebaju biti vidljivi pri ispisu */
          .print\\:table,
          .print\\:block,
          .print\\:table-cell,
          .print\\:table-column,
          #print-header,
          .print-show {
            display: table !important;
            visibility: visible !important;
          }
          
          .print\\:block {
            display: block !important;
          }
          
          .print\\:table-cell {
            display: table-cell !important;
          }
          
          .print\\:table-column {
            display: table-column !important;
          }
          
          /* Prilagodbe za čist ispis */
          body {
            margin: 0;
            padding: 0;
          }
          
          /* Osiguravanje da sadržaj počinje od vrha stranice */
          #print-header {
            margin-top: 0 !important;
            page-break-after: avoid;
          }
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        document.head.removeChild(style);
      };
    }, []);
  }

  return {
    members,
    filteredMembers,
    setFilteredMembers,
    loading,
    error,
    refreshMembers,
    addMember,
    updateMember,
    deleteMember
  };
};
