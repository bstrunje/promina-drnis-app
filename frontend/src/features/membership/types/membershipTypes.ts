import { Member } from "@shared/member";

export type MembershipEndReason = "withdrawal" | "non_payment" | "expulsion" | "death" | "";

// Type for Membership Period
export interface MembershipPeriod {
  period_id?: number;
  member_id?: number;
  start_date: string | Date;
  end_date?: string | Date | null;
  end_reason?: MembershipEndReason | string | null;
}

// Inventory status type
export interface InventoryStatus {
  type: string;
  remaining: number;
  year: number;
}

// Card statistics type
export interface CardStats {
  total: number;
  available: number;
  assigned: number;
}

// Base props for membership components
export interface MembershipComponentProps {
  member: Member;
  onUpdate: (member: Member) => Promise<void>;
  userRole?: string;
  isFeeCurrent?: boolean;
}

// Props for CardNumberSection component
export interface CardNumberSectionProps extends MembershipComponentProps {
  availableCardNumbers: string[];
  isLoadingCardNumbers: boolean;
  cardStats: CardStats | null;
  isLoadingCardStats: boolean;
  cardNumberLength: number;
  isLoadingCardLength: boolean;
  refreshCardStats: () => Promise<void>;
  cardNumber: string;
  setCardNumber: (value: string) => void;
  originalCardNumber: string;
  isSubmitting: boolean;
  handleCardNumberAssign: (e: React.FormEvent) => Promise<void>;
}

// Props for StampManagementSection component
export interface StampManagementSectionProps extends MembershipComponentProps {
  inventoryStatus: InventoryStatus | null;
  nextYearInventoryStatus: InventoryStatus | null;
  stampIssued: boolean;
  nextYearStampIssued: boolean;
  isIssuingStamp: boolean;
  isIssuingNextYearStamp: boolean;
  onStampToggle: (newState: boolean) => Promise<void>;
  onNextYearStampToggle: (newState: boolean) => Promise<void>;
}

// Props for MembershipPeriodsSection component
export interface MembershipPeriodsSectionProps extends MembershipComponentProps {
  periods: MembershipPeriod[];
  totalDuration?: string;
  feePaymentYear?: number;
  feePaymentDate?: string;
  onUpdatePeriods?: (periods: MembershipPeriod[]) => Promise<void>;
}

// Props for PeriodFormRow component
export interface PeriodFormRowProps {
  period: MembershipPeriod;
  index: number;
  isEditing: boolean;
  canSeeEndReason: boolean;
  canManageEndReasons: boolean;
  onPeriodChange: (index: number, field: keyof MembershipPeriod, value: string) => void;
  onEndReasonChange: (periodId: number, newReason: string) => Promise<void>;
}
