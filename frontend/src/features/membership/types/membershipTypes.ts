// Tipovi za props-e i pomoćne UI tipove. Za podatkovne modele koristi shared/types/membership!

import { Member } from '@shared/member';
import { MembershipPeriod } from '@shared/membership';

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

// Props za pojedine UI komponente

export interface MembershipComponentProps {
  member: Member;
  onUpdate: (member: Member) => Promise<void>;
  userRole?: string;
  isFeeCurrent?: boolean;
}

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
  generatedPassword: string | null;
  setGeneratedPassword: (value: string | null) => void;
  handleRegeneratePassword: () => Promise<void>;
  isRegeneratingPassword: boolean;
}

export interface StampManagementSectionProps extends MembershipComponentProps {
  inventoryStatus: InventoryStatus | null;
  nextYearInventoryStatus: InventoryStatus | null;
  stampIssued: boolean;
  nextYearStampIssued: boolean;
  isIssuingStamp: boolean;
  isIssuingNextYearStamp: boolean;
  onStampToggle: (newState: boolean, userRole?: string) => Promise<void>;
  onNextYearStampToggle: (newState: boolean, userRole?: string) => Promise<void>;
}

export interface MembershipPeriodsSectionProps extends MembershipComponentProps {
  periods: import('@shared/membership').MembershipPeriod[];
  totalDuration?: string;
  feePaymentYear?: number;
  feePaymentDate?: string;
  onUpdatePeriods?: (periods: import('@shared/membership').MembershipPeriod[]) => Promise<void>;
}

export interface PeriodFormRowProps {
  period: import('@shared/membership').MembershipPeriod;
  index: number;
  isEditing: boolean;
  canSeeEndReason: boolean;
  canManageEndReasons: boolean;
  onPeriodChange: (index: number, field: keyof import('@shared/membership').MembershipPeriod, value: string) => void;
  onEndReasonChange: (periodId: number, newReason: string) => Promise<void>;
}
