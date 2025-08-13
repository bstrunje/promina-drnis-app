import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { Edit, Save, X } from "lucide-react";
import { Button } from "@components/ui/button";
import { Alert, AlertDescription } from "@components/ui/alert";
import { Member, MemberSkill, MembershipTypeEnum } from "@shared/member";
import { MembershipPeriod } from "@shared/membership";
import { useToast } from "@components/ui/use-toast";
import api from "../../utils/api/apiConfig";
// import { debounce } from "lodash"; // Uklonjeno jer se ne koristi
import { getCurrentDate, getCurrentYear, formatInputDate, validateBirthDate } from "../../utils/dateUtils";
import { parse, parseISO, isValid, isBefore, format } from "date-fns";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation('profile');
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

  const handleSkillsChange = useCallback(({ skills, other_skills }: { skills: MemberSkill[], other_skills: string }) => {
    setEditedMember(prev => prev ? { ...prev, skills, other_skills } : null);
  }, []);

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

  // Helper function to calculate total duration
  // Funkcija za hrvatsku pluralizaciju
  const getHrPluralKey = (count: number, baseKey: string): string => {
    if (count === 1) return `${baseKey}_one`;
    if (count >= 2 && count <= 4) return `${baseKey}_few`;
    return `${baseKey}_other`;
  };

  const calculateTotalDuration = useCallback((periods: MembershipPeriod[]): string => {
    if (!Array.isArray(periods) || periods.length === 0) return "";

    const totalDays = periods.reduce((total, period) => {
      const start = parseISO(period.start_date.toString());
      const end = period.end_date ? parseISO(period.end_date.toString()) : getCurrentDate();
      
      if (!isValid(start) || !isValid(end) || isBefore(end, start)) {
        return total;
      }

      return (
        total +
        Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      );
    }, 0);

    if (totalDays < 0) return "";

    const years = Math.floor(totalDays / 365);
    const months = Math.floor((totalDays % 365) / 30);
    const days = (totalDays % 365) % 30;

    const parts: string[] = [];

    if (years > 0) {
      const yearKey = getHrPluralKey(years, 'duration.years');
      parts.push(t(yearKey, { count: years }));
    }
    if (months > 0) {
      const monthKey = getHrPluralKey(months, 'duration.months');
      parts.push(t(monthKey, { count: months }));
    }
    if (days > 0) {
      const dayKey = getHrPluralKey(days, 'duration.days');
      parts.push(t(dayKey, { count: days }));
    }

    if (parts.length === 0 && totalDays >= 0) {
      return t('duration.days', { count: 0 });
    }

    return parts.join(', ');
  }, [t]);

  // Izračunaj ukupno trajanje i pripremi propse za pod-komponentu
  const membershipHistoryForChild = useMemo(() => {
    if (!member) {
      return { periods: [], totalDuration: '' };
    }
    const periods = (member.membership_history?.periods ?? []).slice().sort((a, b) => 
      new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );
    const totalDuration = calculateTotalDuration(periods);
    return {
      ...member.membership_history,
      periods,
      totalDuration,
    };
  }, [member, calculateTotalDuration]);

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

      const data = response.data;

      // Osiguravamo da su osnovna polja uvijek prisutna
      const memberData: Member = {
        ...data,
        status: data.status ?? 'pending',
        role: data.role ?? 'member',
        membership_type: data.membership_type ?? MembershipTypeEnum.Regular,
        registration_completed: data.registration_completed ?? false,
        total_hours: data.total_hours ?? 0,
        activity_hours: data.activity_hours ?? 0,
        membership_history: data.membership_history ?? { periods: [] },
      };

      setMember(memberData);
setEditedMember(memberData);
    } catch (error) {
      console.error("Error fetching member details:", error);
      setError(
        error instanceof Error
          ? error.message
          : t('fetchError')
      );
    } finally {
      setIsLoading(false);
      if (preserveScroll) {
        setTimeout(() => {
          window.scrollTo(0, savedScrollPosition);
        }, 100);
      }
    }
  }, [memberId, savedScrollPosition, t]);
  
    useEffect(() => {
  if (memberId) {
    void fetchMemberDetails(false); // Označi kao floating promise
  }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [memberId]);

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
            [name]: validation.errorMessage ?? t('invalidBirthDate')
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
        [name]: t('invalidDateFormat')
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
      // Normalizacija datuma prije slanja backendu (sigurnosni korak)
      const toIsoMidnight = (dateStr: string): string => {
        try {
          if (!dateStr) return dateStr;
          let d: Date;
          if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) {
            d = parse(dateStr, "dd.MM.yyyy", new Date());
          } else {
            d = parseISO(dateStr);
          }
          if (!isValid(d)) return dateStr;
          return format(d, "yyyy-MM-dd'T'00:00:00.000'Z'");
        } catch {
          return dateStr;
        }
      };

      const normalized = updatedPeriods.map(p => ({
        ...p,
        start_date: typeof p.start_date === 'string' ? toIsoMidnight(p.start_date) : p.start_date,
        end_date: p.end_date ? (typeof p.end_date === 'string' ? toIsoMidnight(p.end_date) : p.end_date) : null,
      }));

      await api.put(`/members/${memberId}/membership-history`, {
        periods: normalized,
        updateMemberStatus: true // Zahtjev backendu da ažurira status člana na temelju perioda
      });

      // Odmah dohvati nove podatke
      await fetchMemberDetails();

      toast({
        title: t('updateSuccessTitle'),
        description: t('membershipHistoryUpdated'),
      });
    } catch (error) {
      console.error("Failed to update membership history:", error);
      toast({
        title: t('updateErrorTitle'),
        description: t('membershipHistoryUpdateError'),
        variant: "destructive",
      });
    }
  };

  const handleMemberUpdate = async (updatedData?: Partial<Member>): Promise<void> => {
    try {
      if (updatedData && Object.keys(updatedData).length) {
        setMember(prevMember => {
          if (!prevMember) return updatedData as Member;
          // Ispravno spajanje: čuva postojeći history i gazi ga samo ako dođe novi
          return {
            ...prevMember,
            ...updatedData,
            membership_history: updatedData.membership_history ?? prevMember.membership_history,
          };
        });
        
        toast({
          title: t('updateSuccessTitle'),
          description: t('memberUpdated'),
          variant: "success",
        });
      } else {
        await fetchMemberDetails(true);
        
        toast({
          title: t('updateSuccessTitle'),
          description: t('memberUpdated'),
          variant: "success",
        });
      }
    } catch (error) {
      console.error("Failed to update member:", error);
      setError(t('updateErrorDescription'));
      toast({
        title: t('updateErrorTitle'),
        description: error instanceof Error ? error.message : t('updateErrorDescription'),
        variant: "destructive",
      });
    }
  };



  const handleSave = async (): Promise<void> => {
    if (!editedMember) return;
    setIsSubmitting(true);
    try {
      // Priprema podataka za slanje - osiguravanje formatiranja datuma u ISO formatu
      // Kreiramo novi objekt koji sadrži samo polja koja se smiju ažurirati
      const updateData = {
        first_name: editedMember.first_name,
        last_name: editedMember.last_name,
        oib: editedMember.oib,
        email: editedMember.email,
        cell_phone: editedMember.cell_phone,
        street_address: editedMember.street_address,
        city: editedMember.city,
        date_of_birth: editedMember.date_of_birth && !editedMember.date_of_birth.includes('T') 
          ? `${editedMember.date_of_birth}T00:00:00Z` 
          : editedMember.date_of_birth,
        life_status: editedMember.life_status,
        tshirt_size: editedMember.tshirt_size,
        shell_jacket_size: editedMember.shell_jacket_size,
        hat_size: editedMember.hat_size,
        membership_type: editedMember.membership_type,
        skills: editedMember.skills,
        other_skills: editedMember.other_skills,
        functions_in_society: editedMember.functions_in_society,
      };

      console.log('PUT /members/' + memberId + ' payload:', updateData);
      const response = await api.put(`/members/${memberId}`, updateData);

      if (response.data) {
        setMember(response.data as Member);
        setIsEditing(false);
        toast({
          title: t('updateSuccessTitle'),
          description: t('updateSuccessDescription'),
          variant: "success",
        });
        if (onUpdate) {
          onUpdate(response.data as Member);
        }
        void fetchMemberDetails(); // Fetch member details after saving
      }
    } catch (error) {
      setError(t('updateErrorDescription'));
      toast({
        title: t('updateErrorTitle'),
        description:
          error instanceof Error
            ? error.message
            : t('updateErrorDescription'),
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
    return <div className="p-6">{t('loading', { ns: 'profile'})}</div>;
  }

  if (!member) {
    return <div className="p-6">{t('memberNotFound')}</div>;
  }

  return (
    <div className="p-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-lg text-white p-6 mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold mb-2">{t('title')}</h1>
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
                    {isSubmitting ? t('saving', { ns: 'profile'}) : t('saveChanges', { ns: 'profile'})}
                  </Button>
                  <Button
                    onClick={handleCancel}
                    className="bg-gray-500 hover:bg-gray-600"
                  >
                    <X className="w-4 h-4 mr-2" />
                    {t('cancel', { ns: 'common' })}
                  </Button>
                </div>
              ) : (
                <Button onClick={handleEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  {t('editProfile')}
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
        <MemberProfileImage member={member} onUpdate={async () => { await fetchMemberDetails(); }} />

        <MembershipDetailsCard member={member} />

        <MemberBasicInfo
          member={member}
          editedMember={editedMember}
          isEditing={isEditing}
          handleChange={handleChange}
          handleSkillsChange={handleSkillsChange}
          validationErrors={validationErrors}
          onUpdate={() => { void fetchMemberDetails(); }}
          onMemberChange={(updatedMember) => setEditedMember(updatedMember)}
        />

        <MembershipFeeSection
          member={member}
          isEditing={isEditing && canEdit}
          isFeeCurrent={isFeeCurrent}
          onUpdate={(updatedMember: Member) => { void handleMemberUpdate(updatedMember); }}
          membershipHistory={membershipHistoryForChild} // Koristi novi objekt s totalDuration
          memberId={memberId}
          onMembershipHistoryUpdate={handleMembershipHistoryUpdate}
          cardManagerProps={canEdit ? {
            member,
            onUpdate: async (updatedMember: Member) => { await handleMemberUpdate(updatedMember); },
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
