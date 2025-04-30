import React from "react";
import { Member } from "@shared/member";
import MembershipCardManagerModular from "./components/MembershipCardManagerModular";

/**
 * Adapter za MembershipCardManager komponentu koji koristi modularnu arhitekturu
 * 
 * Ovaj adapter omogućuje postupni prelazak s postojećeg MembershipCardManager.tsx
 * na novu modularnu arhitekturu.
 */

// Zadržavamo originalno sučelje MembershipCardManager komponente
interface MembershipCardManagerAdapterProps {
  member: Member;
  onUpdate: (member: Member) => Promise<void>;
  userRole?: string; 
  isFeeCurrent?: boolean;
  hideTitle?: boolean;
}

/**
 * MembershipCardManagerAdapter - Adapter koji povezuje staro sučelje s novom implementacijom
 */
const MembershipCardManagerAdapter: React.FC<MembershipCardManagerAdapterProps> = ({
  member,
  onUpdate,
  userRole,
  isFeeCurrent = true,
  hideTitle = false,
}) => {
  return (
    <MembershipCardManagerModular
      member={member}
      onUpdate={onUpdate}
      userRole={userRole}
      isFeeCurrent={isFeeCurrent}
      hideTitle={hideTitle}
    />
  );
};

export default MembershipCardManagerAdapter;
