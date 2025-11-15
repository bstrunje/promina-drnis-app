import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
const isDev = import.meta.env.DEV;
import api from '../../../utils/api/apiConfig';
import { Member } from '@shared/member';
import { 
  adaptMembershipPeriods, 
  determineMemberActivityStatus, 
  determineFeeStatus,
  determineDetailedMembershipStatus,
  type MemberStatusData
} from '@shared/memberStatus.types';
import { getCurrentDate, getYearForPaymentCheck } from '../../../utils/dateUtils';
import { MemberWithDetails } from '@shared/memberDetails.types';
import { useToast } from "@components/ui/use-toast";
import { useSystemSettings } from '../../../hooks/useSystemSettings';

/**
 * Custom hook za dohvaćanje i manipulaciju podataka o članovima
 * Izdvaja logiku iz komponente u zaseban hook za bolju održivost
 */
export const useMemberData = () => {
  const { toast } = useToast();
  const { systemSettings } = useSystemSettings();
  const { t } = useTranslation('members');
  
  // Dohvati activity hours threshold iz system settings (default 20)
  const activityHoursThreshold = systemSettings?.activityHoursThreshold ?? 20;
  
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
        title: t('toasts.successTitle'),
        description: t('toasts.addSuccess'),
      });
      refreshMembers();
      return true;
    } catch (error) {
      if (isDev) console.error('Error adding member:', error);
      toast({
        title: t('toasts.errorTitle'),
        description: t('toasts.addError'),
        variant: "destructive",
      });
      return false;
    }
  };

  // Funkcija za uređivanje člana
  const updateMember = async (memberId: string, updatedMember: Partial<Member>) => {
    try {
      await api.put(`/members/${memberId}`, updatedMember);
      toast({
        title: t('toasts.successTitle'),
        description: t('toasts.updateSuccess'),
      });
      refreshMembers();
      return true;
    } catch (error) {
      if (isDev) console.error('Error updating member:', error);
      toast({
        title: t('toasts.errorTitle'),
        description: t('toasts.updateError'),
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
        const timestamp = getCurrentDate().getTime();
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
          const isActive = determineMemberActivityStatus(member, activityHoursThreshold) === 'active';
          
          return {
            ...member,
            cardDetails: {
              card_number: member.membership_details?.card_number ?? member.membership_details?.card_number,
              stamp_type: member.life_status as unknown, // Koristi life_status kao tip markice
              card_stamp_issued: false, // Default value, will be updated later
              fee_payment_year: member.membership_details?.fee_payment_year ?? member.membership_details?.fee_payment_year
            },
            isActive,
            // membershipStatus ćemo uskladiti kasnije kada dohvatimo detaljne podatke (periodi + članarina)
            membershipStatus: member.status ?? 'pending'
          };
        });

        setMembers(membersWithDetails);
        setFilteredMembers(membersWithDetails);
        setError(null);
        
        // Now fetch detailed membership information for each member
        const fetchMembershipDetails = async () => {
          try {
            const memberDetailsPromises = membersWithDetails.map((member) => {
              try {
                const periods = Array.isArray(member.membership_history)
                  ? member.membership_history
                  : (member.membership_history?.periods ?? []);

                // Ako nema perioda, a postoji uplata za tekuću godinu, kreiraj novi period
                // Ovo je ključno za prikazivanje statusa za nove članove
                if (periods.length === 0 && member.membership_details?.fee_payment_date) {
                  periods.push({
                    period_id: 0, // Privremeni ID za novi period
                    member_id: member.member_id,
                    start_date: member.membership_details.fee_payment_date,
                    end_date: undefined, // Aktivni period
                    end_reason: undefined
                  });
                }

                const adaptedPeriods = adaptMembershipPeriods(periods);

                // CENTRALIZIRANI STATUS: koristimo determineDetailedMembershipStatus kao i na backendu
                const statusData: MemberStatusData = {
                  status: member.status as MemberStatusData['status'],
                  activity_hours: member.activity_hours,
                  membership_details: member.membership_details
                    ? {
                        fee_payment_year: member.membership_details.fee_payment_year,
                        // fee_payment_date dolazi kao string iz API-ja, helper očekuje string
                        fee_payment_date: member.membership_details.fee_payment_date as unknown as string,
                        card_number: member.membership_details.card_number
                      }
                    : undefined
                };

                // Koristi istu godinu za provjeru kao i ostatak frontenda (Time Traveler aware)
                const yearForCheck = getYearForPaymentCheck();
                const detailedStatus = determineDetailedMembershipStatus(statusData, adaptedPeriods, yearForCheck);
                
                // Izračunaj status plaćanja članarine
                const feeStatus = determineFeeStatus({
                  membership_details: member.membership_details ?? {}
                }, yearForCheck);
                return {
                  ...member,
                  membership_details: member.membership_details,
                  periods: adaptedPeriods,
                  detailedStatus,
                  feeStatus,
                  membershipStatus: detailedStatus.status
                };
              } catch (error: unknown) {
                if (isDev) console.error(`Failed to fetch details for member ${member.member_id}:`, error);
                return member;
              }
            });
            
            const updatedMembers = await Promise.all(memberDetailsPromises);
            setMembers(updatedMembers);
            setFilteredMembers(updatedMembers);
          } catch (error: unknown) {
            if (isDev) console.error(t('errors.fetchMemberDetailsLog'), error);
          } finally {
            setLoading(false);
          }
        };
        
        void fetchMembershipDetails();
      } catch (error: unknown) {
        if (isDev) console.error(t('errors.fetchMembersLog'), error);
        const fallback = t('errors.loadMembers');
        setError(typeof error === 'object' && error && 'message' in error ? (error as { message?: string }).message ?? fallback : fallback);
        setLoading(false);
      }
    };

    void fetchMembers();
  }, [refreshTrigger, activityHoursThreshold, t]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
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
    }
  }, []);

  return {
    members,
    filteredMembers,
    setFilteredMembers,
    loading,
    error,
    refreshMembers,
    addMember,
    updateMember,
   
  };
};
