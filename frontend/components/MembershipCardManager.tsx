import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@components/ui/card";
import { Button } from "@components/ui/button";
import { useToast } from "@components/ui/use-toast";
import { Stamp } from "lucide-react";
import { Member } from "@shared/member";
import { cn } from "@/lib/utils";
import { updateMembership } from "../src/utils/api";

interface Props {
  member: Member;
  onUpdate: (member: Member) => Promise<void>;
}

const MembershipCardManager: React.FC<Props> = ({ member, onUpdate }) => {
  const { toast } = useToast();
  const [cardNumber, setCardNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isIssuingStamp, setIsIssuingStamp] = useState(false);
  const [inventoryStatus, setInventoryStatus] = useState<{
    type: string;
    remaining: number;
  } | null>(null);

  useEffect(() => {
    const checkInventory = async () => {
      try {
        const response = await fetch("/api/stamps/inventory", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (!response.ok) throw new Error("Failed to fetch inventory");
        const data = await response.json();

        const stampType =
          member.life_status === "employed/unemployed"
            ? "employed"
            : member.life_status === "child/pupil/student"
            ? "student"
            : member.life_status === "pensioner"
            ? "pensioner"
            : "employed";

        const relevantInventory = data.find(
          (item: { stamp_type: string }) => item.stamp_type === stampType
        );
        if (relevantInventory) {
          setInventoryStatus({
            type: stampType,
            remaining: relevantInventory.remaining,
          });
        }
      } catch (error) {
        console.error("Error checking inventory:", error);
        toast({
          title: "Error",
          description: "Failed to check stamp inventory",
          variant: "destructive",
        });
      }
    };

    checkInventory();
  }, [member.life_status]);

  const handleCardNumberAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const data = {
      paymentDate: new Date().toISOString(),
      cardNumber,
      stampIssued: true,
    };

    console.log("Attempting to assign card number:", data);

    try {
      const response = await updateMembership(member.member_id, data);
      console.log("Update membership API response:", response);
      console.log("Card assignment response:", response);

      if (!response) {
        throw new Error("No response received from server");
      }

      await onUpdate({
        ...member,
        membership_details: {
          ...member.membership_details,
          card_number: cardNumber,
          card_stamp_issued: true,
        },
      });
      setCardNumber("");

      toast({
        title: "Success",
        description: "Card number assigned successfully",
        variant: "success",
      });
    } catch (error) {
      console.error("Card assignment error details:", {
        error,
        memberId: member.member_id,
        cardNumber,
        memberData: member,
      });

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStampIssue = async () => {
    if (!inventoryStatus?.remaining) {
      toast({
        title: "Error",
        description: "No stamps available in inventory",
        variant: "destructive",
      });
      return;
    }

    setIsIssuingStamp(true);
    try {
      const response = await fetch(`/api/members/${member.member_id}/stamp`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to issue stamp");
      }

      toast({
        title: "Success",
        description: "Stamp issued successfully",
        variant: "success",
      });

      setInventoryStatus((prev) =>
        prev
          ? {
              ...prev,
              remaining: prev.remaining - 1,
            }
          : null
      );

      await onUpdate({ ...member });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to issue stamp",
        variant: "destructive",
      });
    } finally {
      setIsIssuingStamp(false);
    }
  };

  const getStatusColor = () => {
    switch (member.life_status) {
      case "employed/unemployed":
        return "bg-blue-600";
      case "child/pupil/student":
        return "bg-green-600";
      case "pensioner":
        return "bg-red-600";
      default:
        return "bg-gray-600";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Membership Card Management</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Current Card Status */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">Current Status</h4>
          <div className="space-y-2">
            <div>
              <span className="text-sm text-gray-500">Card Number:</span>
              {/* First define the variables at the top of the component */}
              {(() => {
                const cardNumber =
                  member.membership_details?.card_number || member.card_number;
                return cardNumber ? (
                  <span
                    className={`ml-2 px-3 py-1 rounded text-white ${getStatusColor()}`}
                  >
                    {cardNumber}
                  </span>
                ) : (
                  <span className="ml-2 text-gray-400">Not assigned</span>
                );
              })()}
            </div>
            <div>
              <span className="text-sm text-gray-500">Stamp Status:</span>
              <span className="ml-2">
                {(() => {
                  const stampIssued =
                    member.membership_details?.card_stamp_issued ||
                    member.card_stamp_issued;
                  return stampIssued ? (
                    <span className="text-green-600">Issued</span>
                  ) : (
                    <span className="text-yellow-600">Not issued</span>
                  );
                })()}
              </span>
            </div>
          </div>
        </div>

        {/* Card Number Assignment Form */}
        {!member.membership_details?.card_number && (
          <form onSubmit={handleCardNumberAssign} className="mt-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Card Number
                </label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  pattern="[0-9]{5}"
                  title="Card number must be exactly 5 digits"
                  maxLength={5}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={isSubmitting}
                className={cn("w-full", isSubmitting && "opacity-50")}
              >
                {isSubmitting ? "Assigning..." : "Assign Card Number"}
              </Button>
            </div>
          </form>
        )}

        {/* Stamp Issuance */}
        {member.membership_details?.card_number &&
          !member.membership_details?.card_stamp_issued && (
            <div className="mt-4">
              <div className="mb-2 text-sm">
                {inventoryStatus && (
                  <span
                    className={`${
                      inventoryStatus.remaining > 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {inventoryStatus.remaining > 0
                      ? `${inventoryStatus.remaining} stamps available`
                      : "No stamps available"}
                  </span>
                )}
              </div>
              <Button
                onClick={handleStampIssue}
                className="w-full"
                variant="outline"
                disabled={isIssuingStamp || !inventoryStatus?.remaining}
              >
                <Stamp className="w-4 h-4 mr-2" />
                {isIssuingStamp ? "Issuing Stamp..." : "Issue Stamp"}
              </Button>
            </div>
          )}
      </CardContent>
    </Card>
  );
};

export default MembershipCardManager;
