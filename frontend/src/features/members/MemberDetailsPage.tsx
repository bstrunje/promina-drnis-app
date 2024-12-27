import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Edit, Save, X } from "lucide-react";
import { Button } from "@components/ui/button";
import { Alert, AlertDescription } from "@components/ui/alert";
import { Member } from "@shared/types/member";
import { MembershipPeriod } from "@shared/types/membership";
import { Toaster } from "@components/ui/toaster";
import { useToast } from "@components/ui/use-toast";
import api from "../../utils/api";

// Import components
import MemberBasicInfo from "../../../components/MemberBasicInfo";
import MemberActivityStatus from "../../../components/MemberActivityStatus";
import MembershipFeeSection from "../../../components/MembershipFeeSection";
import MembershipCardManager from "../../../components/MembershipCardManager";
import MemberMessagesSection from "../../../components/MemberMessagesSection";
import MembershipHistoryComponent from "../../../components/MembershipHistory";
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
  const memberId = parseInt(id || String(user?.member_id) || "0");

  const [member, setMember] = useState<Member | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedMember, setEditedMember] = useState<Member | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const canEdit = user?.role === "admin" || user?.role === "superuser";
  const isOwnProfile = user?.member_id === memberId;

  const isFeeCurrent = useMemo(() => {
    if (!member?.membership_details?.fee_payment_date) return false;
    const lastPaymentDate = new Date(
      member.membership_details.fee_payment_date
    );
    const currentYear = new Date().getFullYear();
    return lastPaymentDate.getFullYear() >= currentYear;
  }, [member?.membership_details?.fee_payment_date]);

  const fetchMemberDetails = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/members/${memberId}`);
      
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
          ? response.data.membership_history.find((period: MembershipPeriod) => !period.end_date)
            : response.data.membership_history?.current_period
        }
      };
  
      // Debug logs
      console.log("Raw member data:", response.data);
      console.log("Membership history array:", response.data.membership_history);
      console.log("Transformed data:", memberData);
  
      // Validate transformed data
      if (!Array.isArray(memberData.membership_history.periods)) {
        console.warn("Invalid periods structure, resetting to empty array");
        memberData.membership_history.periods = [];
      }
  
      setMember(memberData);
      setEditedMember(memberData);
    } catch (error) {
      console.error("Error fetching member details:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch member details"
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper function to calculate total duration
  const calculateTotalDuration = (periods: MembershipPeriod[]): string => {
    if (!Array.isArray(periods) || periods.length === 0) return '';
    
    const totalDays = periods.reduce((total: number, period: MembershipPeriod) => {
      const start = new Date(period.start_date);
      const end = period.end_date ? new Date(period.end_date) : new Date();
      return total + Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }, 0);
  
    const years = Math.floor(totalDays / 365);
    const months = Math.floor((totalDays % 365) / 30);
    const days = totalDays % 30;
  
    return `${years} years, ${months} months, ${days} days`;
  };

  useEffect(() => {
    if (memberId) {
      fetchMemberDetails();
    }
  }, [memberId]);

  useEffect(() => {
    if (member && member.membership_history) {
      console.log("Membership history:", member.membership_history);
    }
  }, [member]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setEditedMember((prev) =>
      prev
        ? {
            ...prev,
            [name]: value,
          }
        : null
    );
  };

  const handleMembershipHistoryUpdate = async (updatedPeriods: MembershipPeriod[]) => {
    try {
      await api.put(`/members/${memberId}/membership-history`, {
        periods: updatedPeriods
      });
      
      await fetchMemberDetails();
      toast({
        title: "Success",
        description: "Membership history updated successfully",
      });
    } catch (error) {
      console.error('Failed to update membership history:', error);
      toast({
        title: "Error",
        description: "Failed to update membership history",
        variant: "destructive",
      });
    }
  };

  const handleMemberUpdate = async (updatedMember: Member) => {
    try {
      setMember(updatedMember);
      await fetchMemberDetails();
    } catch (error) {
      setError("Failed to update member");
    }
  };

  const handleSave = async () => {
    if (!editedMember) return;
    setIsSubmitting(true);
    try {
      const response = await api.put(`/members/${memberId}`, editedMember);

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
          {(canEdit ||
            (isOwnProfile &&
              (user?.role === "admin" || user?.role === "superuser"))) && (
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
          isEditing={isEditing}
          editedMember={editedMember}
          handleChange={handleChange}
        />

        <MemberActivityStatus member={member} />

        <MembershipFeeSection
          member={member}
          isEditing={isEditing}
          isFeeCurrent={isFeeCurrent}
          onUpdate={handleMemberUpdate}
          userRole={user?.role}
        />

        {isEditing && (
          <MembershipCardManager
            member={member}
            onUpdate={handleMemberUpdate}
          />
        )}

{isLoading ? (
    <div>Loading membership history...</div>
  ) : (
    <MembershipHistoryComponent
      periods={member?.membership_history?.periods || []}
      feePaymentYear={member?.membership_details?.fee_payment_year}
      feePaymentDate={member?.membership_details?.fee_payment_date}
      totalDuration={member?.membership_history?.total_duration}
      currentPeriod={member?.membership_history?.current_period}
      onUpdate={handleMembershipHistoryUpdate}
    />
  )}

        <ActivityHistory memberId={member.member_id} />
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
