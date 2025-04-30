import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@components/ui/card";
import { Member } from "@shared/member";
import { useCardManagement } from "../hooks/useCardManagement";
import { useStampManagement } from "../hooks/useStampManagement";
import CardNumberSection from "./CardNumberSection";
import StampManagementSection from "./StampManagementSection";

interface MembershipCardManagerModularProps {
  member: Member;
  onUpdate: (member: Member) => Promise<void>;
  userRole?: string; 
  isFeeCurrent?: boolean;
  hideTitle?: boolean;
  showPeriods?: boolean;
}

const MembershipCardManagerModular: React.FC<MembershipCardManagerModularProps> = ({ 
  member, 
  onUpdate, 
  userRole, 
  isFeeCurrent = true,
  hideTitle = false,
  showPeriods = false
}) => {
  // Koristimo custom hooks za upravljanje karticama i markicama
  const {
    cardNumber,
    setCardNumber,
    originalCardNumber,
    isSubmitting,
    availableCardNumbers,
    isLoadingCardNumbers,
    cardStats,
    isLoadingCardStats,
    cardNumberLength,
    isLoadingCardLength,
    refreshCardStats,
    handleCardNumberAssign,
  } = useCardManagement(member, onUpdate);

  const {
    stampIssued,
    nextYearStampIssued,
    isIssuingStamp,
    isIssuingNextYearStamp,
    inventoryStatus,
    nextYearInventoryStatus,
    handleStampToggle,
    handleNextYearStampToggle,
  } = useStampManagement(member, onUpdate);

  return (
    <Card>
      {!hideTitle && (
        <CardHeader>
          <CardTitle className="text-lg">Upravljanje članskom karticom</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <div className="p-4 bg-gray-50 rounded-lg space-y-6">
          <h4 className="font-medium mb-2">Trenutni status</h4>
          
          {/* Sekcija za broj kartice */}
          <CardNumberSection 
            member={member}
            onUpdate={onUpdate}
            userRole={userRole}
            isFeeCurrent={isFeeCurrent}
            availableCardNumbers={availableCardNumbers}
            isLoadingCardNumbers={isLoadingCardNumbers}
            cardStats={cardStats}
            isLoadingCardStats={isLoadingCardStats}
            cardNumberLength={cardNumberLength}
            isLoadingCardLength={isLoadingCardLength}
            refreshCardStats={refreshCardStats}
            cardNumber={cardNumber}
            setCardNumber={setCardNumber}
            originalCardNumber={originalCardNumber}
            isSubmitting={isSubmitting}
            handleCardNumberAssign={handleCardNumberAssign}
          />

          {/* Sekcija za upravljanje markicama */}
          <StampManagementSection 
            member={member}
            onUpdate={onUpdate}
            userRole={userRole}
            isFeeCurrent={isFeeCurrent}
            inventoryStatus={inventoryStatus}
            nextYearInventoryStatus={nextYearInventoryStatus}
            stampIssued={stampIssued}
            nextYearStampIssued={nextYearStampIssued}
            isIssuingStamp={isIssuingStamp}
            isIssuingNextYearStamp={isIssuingNextYearStamp}
            onStampToggle={handleStampToggle}
            onNextYearStampToggle={handleNextYearStampToggle}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default MembershipCardManagerModular;
