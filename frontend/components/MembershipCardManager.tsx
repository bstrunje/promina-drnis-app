import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@components/ui/card";
import { Button } from "@components/ui/button";
import { useToast } from "@components/ui/use-toast";
import { Stamp, RefreshCw } from "lucide-react";
import { Member } from "@shared/member";
import { cn } from "@/lib/utils";
import {
  updateMembership,
  getAvailableCardNumbers,
  getAllCardNumbers,
} from "../src/utils/api";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";

interface Props {
  member: Member;
  onUpdate: (member: Member) => Promise<void>;
}

const MembershipCardManager: React.FC<Props> = ({ member, onUpdate }) => {
  const { toast } = useToast();
  // Initialize from membership_details first (source of truth), fall back to direct property
  const [cardNumber, setCardNumber] = useState(
    member?.membership_details?.card_number || member?.card_number || ""
  );
  const [stampIssued, setStampIssued] = useState(
    member?.membership_details?.card_stamp_issued ||
      member?.card_stamp_issued ||
      false
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isIssuingStamp, setIsIssuingStamp] = useState(false);
  const [inventoryStatus, setInventoryStatus] = useState<{
    type: string;
    remaining: number;
  } | null>(null);
  const [availableCardNumbers, setAvailableCardNumbers] = useState<string[]>(
    []
  );
  const [isLoadingCardNumbers, setIsLoadingCardNumbers] = useState(false);
  const [cardStats, setCardStats] = useState<{
    total: number;
    available: number;
    assigned: number;
  } | null>(null);
  const [isLoadingCardStats, setIsLoadingCardStats] = useState(false);

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
  }, [member.life_status, member]);

  // When member data changes, update from the correct source
  useEffect(() => {
    if (member) {
      setCardNumber(
        member.membership_details?.card_number || member.card_number || ""
      );
      setStampIssued(
        member.membership_details?.card_stamp_issued ||
          member.card_stamp_issued ||
          false
      );
    }
  }, [member]);

  // Add a function to fetch available card numbers
  useEffect(() => {
    const fetchCardNumbers = async () => {
      if (member.membership_details?.card_number) return; // Skip if card number already assigned

      setIsLoadingCardNumbers(true);
      try {
        const numbers = await getAvailableCardNumbers();
        console.log("Available card numbers for dropdown:", numbers);
        setAvailableCardNumbers(numbers || []);
      } catch (error) {
        console.error("Failed to load available card numbers:", error);
        toast({
          title: "Error",
          description: "Failed to load available card numbers",
          variant: "destructive",
        });
      } finally {
        setIsLoadingCardNumbers(false);
      }
    };

    fetchCardNumbers();
  }, [member.membership_details?.card_number]);

  const refreshCardStats = async () => {
    setIsLoadingCardStats(true);
    try {
      const data = await getAllCardNumbers();
      console.log("Refreshed card statistics:", data);
      setCardStats(data.stats);

      // If we need to refresh available card numbers as well
      if (!member.membership_details?.card_number) {
        setAvailableCardNumbers(
          data.cards
            .filter((card) => card.status === "available")
            .map((card) => card.card_number)
        );
      }
    } catch (error) {
      console.error("Failed to refresh card statistics:", error);
    } finally {
      setIsLoadingCardStats(false);
    }
  };

  useEffect(() => {
    refreshCardStats();
  }, []);

  const handleCardNumberAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const data = {
      paymentDate: new Date().toISOString(),
      cardNumber,
      stampIssued: false,
    };

    console.log("Attempting to assign card number:", data);

    try {
      const response = await updateMembership(member.member_id, data);
      console.log("Update membership API response:", response);
      console.log("Card assignment response:", response);

      if (!response) {
        throw new Error("No response received from server");
      }

      // Update local state with priority on membership_details
      await onUpdate({
        ...member,
        membership_details: {
          ...member.membership_details,
          card_number: cardNumber,
          card_stamp_issued: false,
        },
        // Still set these for backward compatibility, but membership_details is source of truth
        card_number: cardNumber,
        card_stamp_issued: false,
      });

      setCardNumber("");

      toast({
        title: "Success",
        description: "Card number assigned successfully",
        variant: "success",
      });
    } catch (error: any) {
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
    } catch (error: any) {
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

            {/* Stamp Status Toggle Section */}
            {member.membership_details?.card_number && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Stamp Status</h4>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="stampIssued"
                    checked={stampIssued}
                    onChange={async (e) => {
                      setStampIssued(e.target.checked);

                      try {
                        setIsIssuingStamp(true);
                        await updateMembership(member.member_id, {
                          paymentDate: new Date().toISOString(),
                          cardNumber:
                            member.membership_details?.card_number ||
                            member.card_number,
                          stampIssued: e.target.checked,
                        });

                        // Update the member object
                        await onUpdate({
                          ...member,
                          membership_details: {
                            ...member.membership_details,
                            card_stamp_issued: e.target.checked,
                          },
                          card_stamp_issued: e.target.checked,
                        });

                        toast({
                          title: "Success",
                          description: e.target.checked
                            ? "Stamp marked as issued"
                            : "Stamp marked as not issued",
                          variant: "success",
                        });
                      } catch (error) {
                        toast({
                          title: "Error",
                          description:
                            error instanceof Error
                              ? error.message
                              : "Failed to update stamp status",
                          variant: "destructive",
                        });
                        // Revert the local state if the API call fails
                        setStampIssued(!e.target.checked);
                      } finally {
                        setIsIssuingStamp(false);
                      }
                    }}
                    className="mr-2 h-4 w-4"
                    disabled={isIssuingStamp}
                  />
                  <label htmlFor="stampIssued" className="text-sm">
                    {stampIssued
                      ? "Stamp has been issued"
                      : "Stamp has not been issued"}
                  </label>
                  {isIssuingStamp && (
                    <svg
                      className="animate-spin ml-2 h-4 w-4 text-blue-500"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  )}
                </div>
              </div>
            )}
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
          <>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                {isLoadingCardStats ? (
                  <span>Loading card statistics...</span>
                ) : cardStats ? (
                  <div className="flex space-x-4">
                    <span>Total card numbers: {cardStats.total}</span>
                    <span className="text-blue-600">
                      Assigned: {cardStats.assigned}
                    </span>
                    <span>Available: {cardStats.available}</span>
                  </div>
                ) : (
                  <span>No card statistics available</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                title="Refresh card statistics"
                onClick={refreshCardStats}
                disabled={isLoadingCardStats}
              >
                <RefreshCw
                  className={`h-3 w-3 ${
                    isLoadingCardStats ? "animate-spin" : ""
                  }`}
                />
              </Button>
            </div>
            <form onSubmit={handleCardNumberAssign} className="mt-4">
              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="cardNumber"
                    className="block text-sm font-medium mb-1"
                  >
                    Card Number
                  </Label>

                  {availableCardNumbers.length > 0 ? (
                    <Select
                      value={cardNumber}
                      onValueChange={setCardNumber}
                      disabled={isSubmitting || isLoadingCardNumbers}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={
                            isLoadingCardNumbers
                              ? "Loading card numbers..."
                              : `Select from ${availableCardNumbers.length} available numbers`
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px] overflow-y-auto">
                        {/* Use the member's existing card number instead of undefined currentCardNumber */}
                        {member.membership_details?.card_number && (
                          <SelectItem
                            value={member.membership_details.card_number}
                            className="font-semibold text-blue-600 border-b"
                          >
                            {member.membership_details.card_number} (Current)
                          </SelectItem>
                        )}

                        {availableCardNumbers.map((number) => (
                          <SelectItem key={number} value={number}>
                            {number}
                          </SelectItem>
                        ))}

                        {availableCardNumbers.length === 0 &&
                          !isLoadingCardNumbers && (
                            <div className="py-2 px-2 text-sm text-gray-500">
                              No card numbers available
                            </div>
                          )}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div>
                      {isLoadingCardNumbers ? (
                        <p className="text-sm text-gray-500">
                          Loading card numbers...
                        </p>
                      ) : (
                        <p className="text-sm text-amber-500">
                          No card numbers available. Please add some in
                          Settings.
                        </p>
                      )}
                      <Input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        pattern="[0-9]{5}"
                        title="Card number must be exactly 5 digits"
                        maxLength={5}
                        className="w-full p-2 border rounded mt-1"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={isSubmitting || !cardNumber}
                  className={cn(
                    "w-full bg-black hover:bg-blue-500 transition-colors",
                    isSubmitting && "opacity-50"
                  )}
                >
                  {isSubmitting ? "Assigning..." : "Assign Card Number"}
                </Button>
              </div>
            </form>
          </>
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
                {isIssuingStamp ? "Issuing..." : "Issue Stamp"}
              </Button>
            </div>
          )}
      </CardContent>
    </Card>
  );
};

export default MembershipCardManager;
