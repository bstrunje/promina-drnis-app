import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Edit, Save, X } from "lucide-react";
import { Button } from "@components/ui/button";
import { Alert, AlertDescription } from "@components/ui/alert";
import { Member } from "@shared/member";
import { MembershipPeriod } from "@shared/membership";
import { Toaster } from "@components/ui/toaster";
import { useToast } from "@components/ui/use-toast";
import api from "../../utils/api";
import { debounce } from "lodash";
import { getCurrentDate, getCurrentYear, parseDate, formatInputDate } from "../../utils/dateUtils";
import { parseISO, format } from "date-fns";

// Import components
import MemberBasicInfo from "../../../components/MemberBasicInfo";
import MembershipFeeSection from "../../../components/MembershipFeeSection";
import MembershipCardManager from "../../../components/MembershipCardManager";
import MemberMessagesSection from "../../../components/MemberMessagesSection";
import MemberProfileImage from "../../../components/MemberProfileImage";
import MembershipDetailsCard from "../../../components/MembershipDetailsCard";
import ActivityHistory from "../../../components/ActivityHistory";
import AssignCardNumberForm from "../../../components/AssignCardNumberForm";

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
  const memberId = parseInt(id || String(user?.member_id) || "0");

  const [member, setMember] = useState<Member | null>(null);
  const [editedMember, setEditedMember] = useState<Member | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAssigningPassword, setIsAssigningPassword] = useState<boolean>(false);
  const [savedScrollPosition, setSavedScrollPosition] = useState(0);

  // Check if user can edit - only admins and superusers can
  const canEdit = user?.role === "admin" || user?.role === "superuser";
  
  // Check if this is user's own profile
  const isOwnProfile = user?.member_id === Number(memberId);

  const isFeeCurrent = useMemo(() => {
    if (!member?.membership_details?.fee_payment_year) return false;
    
    const currentYear = getCurrentYear();
    const paymentYear = member.membership_details.fee_payment_year;
    
    // Check if payment is for current or next year
    return paymentYear >= currentYear;
  }, [member?.membership_details?.fee_payment_year]);

  // Debounce member fetch
  const debouncedFetchMember = useMemo(
    () =>
      debounce(async () => {
        try {
          const response = await api.get(`/members/${memberId}`);
          setMember(response.data);
        } catch (error) {
          console.error(error);
        }
      }, 300),
    [memberId]
  );

  const fetchMemberDetails = async (preserveScroll = true) => {
    if (preserveScroll) {
      setSavedScrollPosition(window.scrollY);
    }

    setIsLoading(true);
    try {
      // Add timestamp to prevent caching
      const timestamp = getCurrentDate().getTime();

      // Use your configured API client instead of direct axios
      // This will use the correct base URL from your api.ts configuration
      const response = await api.get(`/members/${memberId}?t=${timestamp}`, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });

      // Properly handle membership_history array
      const memberData = {
        ...response.data,
        membership_history: {
          periods: Array.isArray(response.data.membership_history)
            ? response.data.membership_history // Keep original array if it's an array
            : response.data.membership_history?.periods || [],
          total_duration: calculateTotalDuration(
            Array.isArray(response.data.membership_history)
              ? response.data.membership_history
              : response.data.membership_history?.periods || []
          ),
          current_period: Array.isArray(response.data.membership_history)
            ? response.data.membership_history.find(
                (period: MembershipPeriod) => !period.end_date
              )
            : response.data.membership_history?.current_period,
        },
      };

      // Validacija transformiranih podataka
      if (!Array.isArray(memberData.membership_history.periods)) {
        memberData.membership_history.periods = [];
      }

      // Umjesto console.error naredbi, samo učitavamo podatke
      setMember(memberData);
      setEditedMember(memberData);
    } catch (error) {
      console.error("Error fetching member details:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to fetch member details"
      );
    } finally {
      setIsLoading(false);
      if (preserveScroll) {
        setTimeout(() => {
          window.scrollTo(0, savedScrollPosition);
        }, 100);
      }
    }
  };

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

    return `${years} years, ${months} months, ${days} days`;
  };

  useEffect(() => {
    if (memberId) {
      fetchMemberDetails(false);
    }
  }, [memberId]);

  useEffect(() => {
    if (member && member.membership_history) {
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
        
        setEditedMember((prev) =>
          prev
            ? {
                ...prev,
                [name]: formattedDate,
              }
            : null
        );
      } catch (error) {
        console.error("Invalid date format:", value);
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
      });

      // Odmah dohvati nove podatke
      await fetchMemberDetails();

      toast({
        title: "Success",
        description: "Membership history updated successfully",
      });
    } catch (error) {
      console.error("Failed to update membership history:", error);
      toast({
        title: "Error",
        description: "Failed to update membership history",
        variant: "destructive",
      });
    }
  };

  const handleMemberUpdate = async (updatedData?: Partial<Member>) => {
    try {
      if (updatedData && Object.keys(updatedData).length) {
        setMember((currentMember) => 
          currentMember ? { ...currentMember, ...updatedData } : null
        );
        
        toast({
          title: "Success",
          description: "Member updated successfully",
          variant: "success",
        });
      } else {
        await fetchMemberDetails(true);
        
        toast({
          title: "Success",
          description: "Member updated successfully",
          variant: "success",
        });
      }
    } catch (error) {
      console.error("Failed to update member:", error);
      setError("Failed to update member");
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update member",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
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
        setMember(response.data);
        setIsEditing(false);
        toast({
          title: "Success",
          description: "Member details updated successfully",
          variant: "success",
        });
        if (onUpdate) {
          onUpdate(response.data);
        }
        fetchMemberDetails(); // Fetch member details after saving
      }
    } catch (error) {
      setError("Failed to save member details");
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update member details",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedMember(member);
  };

  const handleCancel = () => {
    setEditedMember(member);
    setIsEditing(false);
    setError(null);
  };

  const handleAssign = (updatedMember: Member) => {
    setMember(updatedMember);
    fetchMemberDetails(); // Fetch member details after assigning password
  };

  const openAssignPasswordModal = () => {
    setIsAssigningPassword(true);
    // Osvježimo dostupne brojeve iskaznica pri svakom otvaranju modala
    console.log("Opening card number assignment modal with fresh data");
  };

  const closeModal = () => {
    setIsAssigningPassword(false);
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!member) {
    return <div className="p-6">Member not found</div>;
  }

  return (
    <div className="p-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-lg text-white p-6 mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold mb-2">Member Profile</h1>
          {/* Show edit button only for admins and superusers, not for regular members */}
          {canEdit && (
            <div>
              {isEditing ? (
                <div className="space-x-2">
                  <Button
                    onClick={handleSave}
                    className="bg-green-500 hover:bg-green-600"
                    disabled={isSubmitting}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSubmitting ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    onClick={handleCancel}
                    className="bg-gray-500 hover:bg-gray-600"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button onClick={handleEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
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
        />

        <MembershipFeeSection
          member={member}
          isEditing={isEditing && canEdit}
          isFeeCurrent={isFeeCurrent}
          onUpdate={handleMemberUpdate}
          userRole={user?.role}
          membershipHistory={{
            periods: member?.membership_history?.periods || [],
            totalDuration: member?.membership_history?.total_duration,
            currentPeriod: member?.membership_history?.current_period
          }}
          memberId={memberId}
          onMembershipHistoryUpdate={handleMembershipHistoryUpdate}
        />

        {canEdit && !member.password_hash && (
          <Button onClick={openAssignPasswordModal}>Assign Password</Button>
        )}

        {isAssigningPassword && (
          <AssignCardNumberForm
            member={member}
            onClose={closeModal}
            onAssign={handleAssign}
            key={`assign-card-${new Date().getTime()}`}
          />
        )}

        {canEdit && (
          <MembershipCardManager
            member={member}
            onUpdate={handleMemberUpdate}
            userRole={user?.role} 
            isFeeCurrent={isFeeCurrent} 
          />
        )}

        <ActivityHistory
          memberId={member.member_id}
          key={`activities-${member.member_id}`} // Dodaj key da se osvježi samo kad se promijeni član
        />
      </div>

      {/* Always visible sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <MemberMessagesSection member={member} />
      </div>

      <Toaster />
    </div>
  );
};

export default MemberDetailsPage;
