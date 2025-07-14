import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Edit, Save, X } from "lucide-react";
import { Button } from "@components/ui/button";
import { Alert, AlertDescription } from "@components/ui/alert";
import { Member, MembershipTypeEnum } from "@shared/member";
import { MembershipPeriod } from "@shared/membership";
import { useToast } from "@components/ui/use-toast";
import api from "../../utils/api/apiConfig";
// import { debounce } from "lodash"; // Uklonjeno jer se ne koristi
import { getCurrentDate, getCurrentYear, formatInputDate, validateBirthDate } from "../../utils/dateUtils";
import { parseISO } from "date-fns";
import { useTranslation } from "react-i18next"; // Dodajemo useTranslation hook
// Import components
import MemberBasicInfo from "../../../components/MemberBasicInfo";
import MembershipFeeSection from "../../../components/MembershipFeeSection";
import MemberMessagesSection from "../../../components/MemberMessagesSection";
import MemberProfileImage from "../../../components/MemberProfileImage";
import MembershipDetailsCard from "../../../components/MembershipDetailsCard";
import ActivityHistory from "../../../components/ActivityHistory";


interface Props {
  memberId?: number;
  currentUser?: {
    role: string;
    member_id: number;
  };
  onUpdate?: (member: Member) => void;
}

const MemberDetailsPage: React.FC<Props> = ({ onUpdate }) => {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  // Ako id nije definiran, koristi user.member_id ili fallback na "0" (default)
const memberId = useMemo(() => {
  if (id) return parseInt(id, 10);
  if (user?.member_id) return user.member_id;
  return 0;
}, [id, user]);

  const [member, setMember] = useState<Member | null>(null);
  const [editedMember, setEditedMember] = useState<Member | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [savedScrollPosition, setSavedScrollPosition] = useState(0);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Check if user can edit - only admins and superusers can
  const canEdit = user?.role === "member_administrator" || user?.role === "member_superuser";
  
  // Check if this is user's own profile

  const isFeeCurrent = useMemo(() => {
    if (!member?.membership_details?.fee_payment_year) return false;
    
    const currentYear = getCurrentYear();
    const paymentYear = member.membership_details.fee_payment_year;
    
    // Check if payment is for current or next year
    return paymentYear >= currentYear;
  }, [member?.membership_details?.fee_payment_year]);


  const fetchMemberDetails = useCallback(async (preserveScroll = true): Promise<void> => {
    if (preserveScroll) {
      setSavedScrollPosition(window.scrollY);
    }

    setIsLoading(true);
    try {
      // Add timestamp to prevent caching
      const timestamp = getCurrentDate().getTime();

      // Use your configured API client instead of direct axios
      // This will use the correct base URL from your api.ts configuration
      // Tipiziraj response kao Member
const response = await api.get<Member>(`/members/${memberId}?t=${timestamp}`, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });

      // Dodaj default vrijednosti prema schema.prisma
const data = response.data as Member | (Member & { membership_history?: unknown });

// Sigurno dohvaćanje periods polja
let periods: MembershipPeriod[] = [];
if (Array.isArray(data.membership_history)) {
  periods = data.membership_history as MembershipPeriod[];
} else if (
  data.membership_history &&
  typeof data.membership_history === 'object' &&
  Array.isArray((data.membership_history as { periods?: unknown }).periods)
) {
  periods = (data.membership_history as { periods: MembershipPeriod[] }).periods;
}

const memberData: Member = {
  ...data,
  status: data.status ?? 'pending',
  role: data.role ?? 'member',
  membership_type: data.membership_type ?? MembershipTypeEnum.Regular, // koristi enum za tip
  registration_completed: data.registration_completed ?? false,
  total_hours: data.total_hours ?? 0,
  membership_history: {
    periods,
    total_duration: calculateTotalDuration(periods),
  },
};

      setMember(memberData);
setEditedMember(memberData);
    } catch (error) {
      console.error("Error fetching member details:", error);
      setError(
        error instanceof Error
          ? error.message
          : t('memberProfile.fetchError')
      );
    } finally {
      setIsLoading(false);
      if (preserveScroll) {
        setTimeout(() => {
          window.scrollTo(0, savedScrollPosition);
        }, 100);
      }
    }
  }, [memberId, savedScrollPosition]);
  
  // Helper function to calculate total duration
  const calculateTotalDuration = (periods: MembershipPeriod[]): string => {
    if (!Array.isArray(periods) || periods.length === 0) return "";

    const totalDays = periods.reduce(
      (total: number, period: MembershipPeriod) => {
        const start = parseISO(period.start_date.toString());
        const end = period.end_date ? parseISO(period.end_date.toString()) : getCurrentDate();
        return (
          total +
          Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
        );
      },
      0
    );

    const years = Math.floor(totalDays / 365);
    const months = Math.floor((totalDays % 365) / 30);
    const days = totalDays % 30;

    // Korištenje i18n za prikaz trajanja
    const formattedYears = years > 0 ? t('navigation.duration.years', { count: years }) : '';
    const formattedMonths = months > 0 ? t('navigation.duration.months', { count: months }) : '';
    const formattedDays = days > 0 ? t('navigation.duration.days', { count: days }) : '';
    
    // Spajanje dijelova trajanja, preskačući one koji su 0
    const durationParts = [
      formattedYears,
      formattedMonths,
      formattedDays
    ].filter(part => part !== '');
    
    // Ako nema dijelova, vrati poruku da nema podataka o trajanju
    if (durationParts.length === 0) {
      return t('navigation.duration.noDuration');
    }
    
    return durationParts.join(', ');
  };

  useEffect(() => {
  if (memberId) {
    void fetchMemberDetails(false); // Označi kao floating promise
  }
}, [memberId, fetchMemberDetails]); // Dodan fetchMemberDetails u dependencies

  useEffect(() => {
    if (member?.membership_history) {
      // Uklanjam console.error log 
    }
  }, [member]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    // Posebna obrada za datumska polja
    if (name === 'date_of_birth') {
      try {
        // Osiguravamo da je format datuma za input fields yyyy-mm-dd
        const formattedDate = formatInputDate(value);
        
        // Validacija datuma rođenja - ne može biti u budućnosti
        const validation = validateBirthDate(formattedDate);
        
        if (!validation.isValid) {
          setValidationErrors(prev => ({
            ...prev,
            [name]: validation.errorMessage ?? t('memberProfile.invalidBirthDate')
          }));
        } else {
          setValidationErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[name];
            return newErrors;
          });
        }
        
        setEditedMember((prev) =>
          prev
            ? {
                ...prev,
                [name]: formattedDate,
              }
            : null
        );
      } catch {
      console.error("Invalid date format:", value);
      setValidationErrors(prev => ({
        ...prev,
        [name]: t('memberProfile.invalidDateFormat')
      }));
      
      setEditedMember((prev) =>
        prev
          ? {
              ...prev,
              [name]: value,
            }
          : null
      );
    }
    } else {
      setEditedMember((prev) =>
        prev
          ? {
              ...prev,
              [name]: value,
            }
          : null
      );
    }
  };

  const handleMembershipHistoryUpdate = async (
    updatedPeriods: MembershipPeriod[]
  ) => {
    try {
      await api.put(`/members/${memberId}/membership-history`, {
        periods: updatedPeriods,
        updateMemberStatus: true // Zahtjev backendu da ažurira status člana na temelju perioda
      });

      // Odmah dohvati nove podatke
      await fetchMemberDetails();

      toast({
        title: t('memberProfile.updateSuccessTitle'),
        description: t('memberProfile.membershipHistoryUpdated'),
      });
    } catch (error) {
      console.error("Failed to update membership history:", error);
      toast({
        title: t('memberProfile.updateErrorTitle'),
        description: t('memberProfile.membershipHistoryUpdateError'),
        variant: "destructive",
      });
    }
  };

  const handleMemberUpdate = async (updatedData?: Partial<Member>): Promise<void> => {
    try {
      if (updatedData && Object.keys(updatedData).length) {
        setMember((currentMember) => 
          currentMember ? { ...currentMember, ...updatedData } : null
        );
        
        toast({
          title: t('memberProfile.updateSuccessTitle'),
          description: t('memberProfile.memberUpdated'),
          variant: "success",
        });
      } else {
        await fetchMemberDetails(true);
        
        toast({
          title: t('memberProfile.updateSuccessTitle'),
          description: t('memberProfile.memberUpdated'),
          variant: "success",
        });
      }
    } catch (error) {
      console.error("Failed to update member:", error);
      setError(t('memberProfile.updateErrorDescription'));
      toast({
        title: t('memberProfile.updateErrorTitle'),
        description: error instanceof Error ? error.message : t('memberProfile.updateErrorDescription'),
        variant: "destructive",
      });
    }
  };

  const handleSave = async (): Promise<void> => {
    if (!editedMember) return;
    setIsSubmitting(true);
    try {
      // Priprema podataka za slanje - osiguravanje formatiranja datuma u ISO formatu
      const formattedMember = { ...editedMember };
      
      // Ako je date_of_birth u formatu godine-mjesec-dan (input format), 
      // dodaj 'T00:00:00Z' da bismo dobili ISO string
      if (formattedMember.date_of_birth && !formattedMember.date_of_birth.includes('T')) {
        formattedMember.date_of_birth = `${formattedMember.date_of_birth}T00:00:00Z`;
      }
      
      const response = await api.put(`/members/${memberId}`, formattedMember);

      if (response.data) {
        setMember(response.data as Member);
        setIsEditing(false);
        toast({
          title: t('memberProfile.updateSuccessTitle'),
          description: t('memberProfile.updateSuccessDescription'),
          variant: "success",
        });
        if (onUpdate) {
          onUpdate(response.data as Member);
        }
        void fetchMemberDetails(); // Fetch member details after saving
      }
    } catch (error) {
      setError(t('memberProfile.updateErrorDescription'));
      toast({
        title: t('memberProfile.updateErrorTitle'),
        description:
          error instanceof Error
            ? error.message
            : t('memberProfile.updateErrorDescription'),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (): void => {
    setIsEditing(true);
    setEditedMember(member);
  };

  const handleCancel = (): void => {
    setEditedMember(member);
    setIsEditing(false);
    setError(null);
  };





  if (isLoading) {
    return <div className="p-6">{t('common.loading')}</div>;
  }

  if (!member) {
    return <div className="p-6">{t('memberProfile.memberNotFound')}</div>;
  }

  return (
    <div className="p-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-lg text-white p-6 mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold mb-2">{t('memberProfile.title')}</h1>
          {/* Show edit button only for admins and superusers, not for regular members */}
          {canEdit && (
            <div>
              {isEditing ? (
                <div className="space-x-2">
                  <Button
                    onClick={() => { void handleSave(); }}
                    className="bg-green-500 hover:bg-green-600"
                    disabled={isSubmitting}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSubmitting ? t('memberProfile.saving') : t('memberProfile.saveChanges')}
                  </Button>
                  <Button
                    onClick={handleCancel}
                    className="bg-gray-500 hover:bg-gray-600"
                  >
                    <X className="w-4 h-4 mr-2" />
                    {t('memberProfile.cancel')}
                  </Button>
                </div>
              ) : (
                <Button onClick={handleEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  {t('memberProfile.editProfile')}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MemberProfileImage member={member} onUpdate={fetchMemberDetails} />

        <MembershipDetailsCard member={member} />

        <MemberBasicInfo
          member={member}
          isEditing={isEditing && canEdit}
          editedMember={editedMember}
          handleChange={handleChange}
          validationErrors={validationErrors}
        />

        <MembershipFeeSection
          member={member}
          isEditing={isEditing && canEdit}
          isFeeCurrent={isFeeCurrent}
          onUpdate={(updatedMember: Member) => { void handleMemberUpdate(updatedMember); }}
          membershipHistory={{
            periods: member?.membership_history?.periods ?? [],
            totalDuration: member?.membership_history?.total_duration,
            currentPeriod: member?.membership_history?.current_period
          }}
          memberId={memberId}
          onMembershipHistoryUpdate={handleMembershipHistoryUpdate}
          cardManagerProps={canEdit ? {
            member,
            onUpdate: (updatedMember: Member) => handleMemberUpdate(updatedMember),
            isFeeCurrent,
            hideTitle: true  
          } : undefined}
        />



        <ActivityHistory
          memberId={member.member_id}
          key={`activities-${member.member_id}`} // Dodaj key da se osvježi samo kad se promijeni član
        />
      </div>

      {/* Always visible sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <MemberMessagesSection member={member} />
      </div>

    </div>
  );
};

export default MemberDetailsPage;
