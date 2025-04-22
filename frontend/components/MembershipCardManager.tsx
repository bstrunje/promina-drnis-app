import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@components/ui/card";
import { Button } from "@components/ui/button";
import { useToast } from "@components/ui/use-toast";
import { RefreshCw } from "lucide-react";
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
import api from "../src/utils/api";
import { useCardNumberLength } from "../src/hooks/useCardNumberLength";
import { getCurrentDate, getCurrentYear } from "../src/utils/dateUtils";

// Update the Props interface to include userRole
interface Props {
  member: Member;
  onUpdate: (member: Member) => Promise<void>;
  userRole?: string; // Add this line
  isFeeCurrent?: boolean; // Add this new prop
}

const MembershipCardManager: React.FC<Props> = ({ member, onUpdate, userRole, isFeeCurrent = true }) => {
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
  const [nextYearStampIssued, setNextYearStampIssued] = useState(
    member?.membership_details?.next_year_stamp_issued || false
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isIssuingStamp, setIsIssuingStamp] = useState(false);
  const [isIssuingNextYearStamp, setIsIssuingNextYearStamp] = useState(false);
  const [inventoryStatus, setInventoryStatus] = useState<{
    type: string;
    remaining: number;
    year: number;
  } | null>(null);
  const [nextYearInventoryStatus, setNextYearInventoryStatus] = useState<{
    type: string;
    remaining: number;
    year: number;
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

  // Dohvati dinamičku duljinu broja kartice
  const { length: cardNumberLength, isLoading: isLoadingCardLength } = useCardNumberLength();

  // Effect to check stamp inventory
  useEffect(() => {
    const checkInventory = async () => {
      try {
        const response = await api.get("/stamps/inventory");

        const data = response.data;

        const stampType =
          member.life_status === "employed/unemployed"
            ? "employed"
            : member.life_status === "child/pupil/student"
            ? "student"
            : member.life_status === "pensioner"
            ? "pensioner"
            : "employed";

        // Pronađi zalihu markica za tekuću godinu
        const currentYearInventory = data.find(
          (item: { stamp_type: string, stamp_year: number }) => 
            item.stamp_type === stampType && item.stamp_year === getCurrentYear()
        );

        // Pronađi zalihu markica za sljedeću godinu
        const nextYearInventory = data.find(
          (item: { stamp_type: string, stamp_year: number }) => 
            item.stamp_type === stampType && item.stamp_year === getCurrentYear() + 1
        );

        if (currentYearInventory) {
          setInventoryStatus({
            type: stampType,
            remaining: currentYearInventory.remaining,
            year: getCurrentYear(),
          });
        }

        if (nextYearInventory) {
          setNextYearInventoryStatus({
            type: stampType,
            remaining: nextYearInventory.remaining,
            year: getCurrentYear() + 1,
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
      
      // Explicitly log the stamp status we're setting
      const newStampState = member.membership_details?.card_stamp_issued || 
        member.card_stamp_issued || 
        false;
      
      setStampIssued(newStampState);
    }
  }, [member]);

  // Add a function to fetch available card numbers
  useEffect(() => {
    const fetchCardNumbers = async () => {
      setIsLoadingCardNumbers(true);
      try {
        const numbers = await getAvailableCardNumbers();
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
  }, []);

  const refreshCardStats = async () => {
    setIsLoadingCardStats(true);
    try {
      const data = await getAllCardNumbers();
      setCardStats(data.stats);

      // If we need to refresh available card numbers as well
      setAvailableCardNumbers(
        data.cards
          .filter((card) => card.status === "available")
          .map((card) => card.card_number)
      );
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
      paymentDate: getCurrentDate().toISOString(),
      cardNumber,
      stampIssued: false,
    };

    try {
      const response = await updateMembership(member.member_id, data);

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

  // Add a function to check if user can return stamps (only superusers)
  const canReturnStamp = userRole === "superuser";
  
  // Funkcija za određivanje tipa markice prema statusu člana
  const getMemberStampType = (member: any): string => {
    // Logika slična onoj u backend controller-u
    if (member.life_status === "employed/unemployed") {
      return "employed";
    } else if (member.life_status === "child/pupil/student") {
      return "student";
    } else if (member.life_status === "pensioner") {
      return "pensioner";
    }
    // Zadani tip ako nema status
    return "employed";
  };

  // Modify handleStampToggle to ensure proper inventory update
  const handleStampToggle = async (newState: boolean) => {
    // If user is trying to uncheck (return stamp) but doesn't have permission
    if (!newState && !canReturnStamp) {
      toast({
        title: "Permission Denied",
        description: "Only superusers can return stamps to inventory",
        variant: "destructive",
      });
      return; // Stop the function here
    }
    
    // Check inventory before issuing
    if (newState && inventoryStatus && inventoryStatus.remaining <= 0) {
      toast({
        title: "Error",
        description: "No stamps available in inventory",
        variant: "destructive",
      });
      return;
    }
    
    // Save the current UI state to avoid flickering
    setStampIssued(newState);
    
    try {
      setIsIssuingStamp(true);
      
      let apiSuccess = false;
      let updatedMember = null;
  
      if (newState) {
        // Issue stamp API call
        const response = await api.post(`/members/${member.member_id}/stamp`, { forNextYear: false });
        apiSuccess = true;
  
        // Update inventory display if shown
        setInventoryStatus((prev) =>
          prev ? { ...prev, remaining: prev.remaining - 1 } : null
        );
      } else {
        // Return stamp API call
        const response = await api.post(`/members/${member.member_id}/stamp/return`, { forNextYear: false });
        
        // Try to get the updated member from the response
        if (response.data && response.data.member) {
          updatedMember = response.data.member;
        }
        
        apiSuccess = true;
  
        // Update inventory display if shown
        setInventoryStatus((prev) =>
          prev ? { ...prev, remaining: prev.remaining + 1 } : null
        );
      }
  
      if (apiSuccess) {      
        // Create a partial update object to avoid full page refresh
        const updatedData = {
          card_stamp_issued: newState,
          membership_details: {
            ...(member.membership_details || {}),
            card_stamp_issued: newState,
          }
        };
        
        // Pass the specific update data to the parent component
        await onUpdate(updatedMember || {
          ...member,
          ...updatedData
        });
        
        toast({
          title: "Success",
          description: newState ? "Stamp marked as issued" : "Stamp marked as not issued",
          variant: "success",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update stamp status",
        variant: "destructive",
      });
      // Revert the UI state if API call fails
      setStampIssued(!newState);
    } finally {
      setIsIssuingStamp(false);
    }
  };

  // Dodana nova funkcija za rukovanje izdavanjem markice za sljedeću godinu
  const handleNextYearStampToggle = async (newState: boolean) => {
    // If user is trying to uncheck (return stamp) but doesn't have permission
    if (!newState && !canReturnStamp) {
      toast({
        title: "Permission Denied",
        description: "Only superusers can return stamps to inventory",
        variant: "destructive",
      });
      return; // Stop the function here
    }
    
    // Fetch next year's inventory status
    const nextYear = getCurrentYear() + 1;
    
    try {
      // Dohvati status inventara za sljedeću godinu (odvojeno od tekuće godine)
      let nextYearInventory = null;
      if (newState) {
        const response = await api.get(`/stamps/inventory/${nextYear}`);
        const stampType = getMemberStampType(member);
        
        nextYearInventory = response.data.find(
          (item: any) => item.stamp_type === stampType && item.stamp_year === nextYear
        );
        
        // Provjeri ima li dostupnih markica za sljedeću godinu
        if (!nextYearInventory || nextYearInventory.remaining <= 0) {
          toast({
            title: "Nedovoljan inventar",
            description: `Nema dostupnih markica za ${nextYear}. godinu. Molimo dodajte markice kroz Admin Dashboard.`,
            variant: "destructive",
          });
          return;
        }
      }
    
      // Save the current UI state to avoid flickering
      setNextYearStampIssued(newState);
      
      setIsIssuingNextYearStamp(true);
      
      let apiSuccess = false;
      let updatedMember = null;
  
      if (newState) {
        // Issue stamp API call for next year
        const response = await api.post(`/members/${member.member_id}/stamp`, { forNextYear: true });
        apiSuccess = true;
        
        // Ne ažuriramo lokalni UI za trenutnu godinu jer to nije ono što se mijenja
        // U stvarnosti se mijenja inventar za sljedeću godinu
      } else {
        // Return stamp API call for next year
        const response = await api.post(`/members/${member.member_id}/stamp/return`, { forNextYear: true });
        
        // Try to get the updated member from the response
        if (response.data && response.data.member) {
          updatedMember = response.data.member;
        }
        
        apiSuccess = true;
        
        // Ne ažuriramo lokalni UI za trenutnu godinu
      }
  
      if (apiSuccess) {      
        // Create a partial update object to avoid full page refresh
        const updatedData = {
          membership_details: {
            ...(member.membership_details || {}),
            next_year_stamp_issued: newState,
          }
        };
        
        // Pass the specific update data to the parent component
        await onUpdate(updatedMember || {
          ...member,
          ...updatedData
        });
        
        // Jasna poruka koja uključuje informaciju o godini
        toast({
          title: "Uspjeh!",
          description: newState 
            ? `Markica za ${nextYear}. godinu je izdana` 
            : `Markica za ${nextYear}. godinu je vraćena`,
          variant: "success",
        });
      }
    } catch (error) {
      toast({
        title: "Greška",
        description: error instanceof Error 
          ? error.message 
          : `Neuspješno ${newState ? "izdavanje" : "vraćanje"} markice za sljedeću godinu`,
        variant: "destructive",
      });
      // Revert the UI state if API call fails
      setNextYearStampIssued(!newState);
    } finally {
      setIsIssuingNextYearStamp(false);
    }
  };

  const getStatusColor = () => {
    switch (member.life_status) {
      case "employed/unemployed":
        return "bg-blue-300";
      case "child/pupil/student":
        return "bg-green-300";
      case "pensioner":
        return "bg-red-300";
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
                    className={`ml-2 px-3 py-1 rounded text-black ${getStatusColor()}`}
                  >
                    {cardNumber}
                  </span>
                ) : (
                  <span className="ml-2 text-gray-400">Not assigned</span>
                );
              })()}
            </div>

            {/* Stamp Status */}
            <div className="mt-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Stamp Status:</span>
              </div>
              
              {/* Current Year Stamp Section */}
              <div className="bg-white border rounded-md p-3 mb-3">
                <div className="flex justify-between mb-2">
                  <h5 className="font-medium text-sm">{getCurrentYear()} (Tekuća godina)</h5>
                  
                  {/* Current Year Inventory Status */}
                  {inventoryStatus && (
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      Dostupno markica:{" "}
                      <span
                        className={`font-bold ${
                          inventoryStatus.remaining > 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {inventoryStatus.remaining}
                      </span>
                    </span>
                  )}
                </div>
                
                {/* Provjera je li članarina plaćena za tekuću godinu - poboljšana logika */}
                {(member?.membership_details?.fee_payment_year === getCurrentYear() || 
                  member?.membership_details?.card_stamp_issued === true) ? (
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="stamp-toggle"
                      checked={stampIssued}
                      onChange={(e) => handleStampToggle(e.target.checked)}
                      disabled={isIssuingStamp || isSubmitting || (!stampIssued && inventoryStatus?.remaining === 0)}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="stamp-toggle" className="text-sm font-medium cursor-pointer">
                      Markica izdana
                      {isIssuingStamp && <RefreshCw className="w-3 h-3 ml-2 inline animate-spin" />}
                    </Label>
                  </div>
                ) : (
                  <div className="text-sm text-amber-600 italic">
                    Članarina za {getCurrentYear()} nije plaćena. Nije moguće upravljati markicom.
                  </div>
                )}
              </div>
              
              {/* Next Year Stamp Section - Enabled for renewal payments, near year end, or if next year fee is already paid */}
              {(new Date().getMonth() >= 10 || 
                member?.membership_details?.fee_payment_year === getCurrentYear() + 1 ||
                member?.membership_details?.next_year_stamp_issued === true) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <div className="flex justify-between mb-2">
                    <h5 className="font-medium text-sm">{getCurrentYear() + 1} (Sljedeća godina)</h5>
                    
                    {/* Next Year Inventory Status */}
                    {nextYearInventoryStatus && (
                      <span className="text-xs bg-yellow-100 px-2 py-1 rounded">
                        Dostupno markica:{" "}
                        <span
                          className={`font-bold ${
                            nextYearInventoryStatus.remaining > 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {nextYearInventoryStatus.remaining}
                        </span>
                      </span>
                    )}
                  </div>
                  
                  {/* Provjera je li članarina plaćena unaprijed za sljedeću godinu - poboljšana logika */}
                  {(member?.membership_details?.fee_payment_year === getCurrentYear() + 1 || 
                    member?.membership_details?.next_year_stamp_issued === true) ? (
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="next-year-stamp-toggle"
                        checked={nextYearStampIssued}
                        onChange={(e) => handleNextYearStampToggle(e.target.checked)}
                        disabled={isIssuingNextYearStamp || isSubmitting || (!nextYearStampIssued && nextYearInventoryStatus?.remaining === 0)}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="next-year-stamp-toggle" className="text-sm font-medium cursor-pointer">
                        Markica izdana
                        {isIssuingNextYearStamp && <RefreshCw className="w-3 h-3 ml-2 inline animate-spin" />}
                      </Label>
                    </div>
                  ) : (
                    <div className="text-sm text-amber-600 italic">
                      Članarina za {getCurrentYear() + 1} nije plaćena. Nije moguće upravljati markicom.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card Number Assignment Form - Always show regardless of existing card number */}
        <div className="mb-2 flex items-center justify-between mt-4">
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

                    {/* Filter out current card number from available numbers to avoid duplicate keys */}
                    {availableCardNumbers
                      .filter(number => number !== member.membership_details?.card_number)
                      .map((number) => (
                        <SelectItem key={number} value={number}>
                          {number}
                        </SelectItem>
                      ))
                    }
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
                    pattern={`[0-9]{${cardNumberLength}}`}
                    title={`Card number must be exactly ${cardNumberLength} digits`}
                    maxLength={cardNumberLength}
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
      </CardContent>
    </Card>
  );
};

export default MembershipCardManager;
