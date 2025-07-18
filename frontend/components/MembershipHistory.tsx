import React from "react";
import { MembershipPeriod } from "@shared/membership";
import MembershipHistoryAdapter from "../src/features/membership/MembershipHistoryAdapter";

interface MembershipHistoryProps {
  periods: MembershipPeriod[];
  memberId: number;
  feePaymentYear?: number;
  feePaymentDate?: string;
  totalDuration?: string;
  currentPeriod?: MembershipPeriod;
  onUpdatePeriods?: (periods: MembershipPeriod[]) => Promise<void>;
}

/**
 * MembershipHistory - Komponenta za prikaz i upravljanje povijesti članstva
 * 
 * NAPOMENA: Ova komponenta sad koristi modularniji pristup kroz MembershipHistoryAdapter.
 * Sučelje je zadržano za kompatibilnost s postojećim kodom.
 */
const MembershipHistory: React.FC<MembershipHistoryProps> = (props) => {
  return <MembershipHistoryAdapter {...props} onUpdatePeriods={props.onUpdatePeriods} />;
};

export default MembershipHistory;
