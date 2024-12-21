import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Edit, Save, X } from "lucide-react";
import { Button } from "@components/ui/button";
import { Alert, AlertDescription } from "@components/ui/alert";
import { Member } from "../../../../shared/types/member";
import { Toaster } from "@components/ui/toaster";
import { useToast } from "@components/ui/use-toast";
import api from "../../utils/api";
import { Card, CardHeader, CardTitle, CardContent } from "@components/ui/card";

// Import new components
import MemberBasicInfo from "../../../components/MemberBasicInfo";
import MemberActivityStatus from "../../../components/MemberActivityStatus";
import MembershipFeeSection from "../../../components/MembershipFeeSection";
import MembershipCardManager from "../members/MembershipCardManager";
import MemberMessagesSection from "../../../components/MemberMessagesSection";
import MembershipPeriods from "../../../components/MembershipPeriods";

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
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(`/api/members/${memberId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Failed to fetch member details");
      const data = await response.json();
      console.log("Member data:", data);
      setMember(data);
      setEditedMember(data);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to fetch member details"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (memberId) {
      fetchMemberDetails();
    }
  }, [memberId]);

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
        description: "Failed to update member details",
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

  const getStatusColor = (status: Member["life_status"]) => {
    switch (status) {
        case "employed/unemployed":
            return "bg-blue-600 text-white";
        case "child/pupil/student":
            return "bg-green-600 text-white";
        case "pensioner":
            return "bg-red-600 text-white";
        default:
            return "bg-gray-600 text-white";
    }
};

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

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Membership Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {member.membership_details?.card_number && (
              <div>
                <label className="text-sm text-gray-500">Card Number</label>
                <p
                  className={`px-3 py-1 rounded-lg font-mono ${getStatusColor(
                    member.life_status
                  )}`}
                >
                  {member.membership_details.card_number}
                </p>
              </div>
            )}
            <div>
              <label className="text-sm text-gray-500">Membership Type</label>
              <p>{member.membership_type}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Role</label>
              <p>{member.role}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

        {member.membership_history && member.membership_history.periods && (
          <MembershipPeriods
            member={member}
            periods={member.membership_history.periods}
          />
        )}
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
