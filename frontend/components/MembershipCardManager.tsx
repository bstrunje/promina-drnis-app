import React from "react";
import { Member } from "@shared/member";
import MembershipCardManagerAdapter from "../src/features/membership/MembershipCardManagerAdapter";

// Update the Props interface to include userRole and membership history
interface Props {
  member: Member;
  onUpdate: (member: Member) => Promise<void>;
  userRole?: string; 
  isFeeCurrent?: boolean;
  hideTitle?: boolean;
}

/**
 * MembershipCardManager - Komponenta za upravljanje članskom karticom
 * 
 * NAPOMENA: Ova komponenta sad koristi modularniji pristup kroz MembershipCardManagerAdapter.
 * Sučelje je zadržano za kompatibilnost s postojećim kodom.
 */
const MembershipCardManager: React.FC<Props> = (props) => {
  return <MembershipCardManagerAdapter {...props} />;
};

export default MembershipCardManager;
