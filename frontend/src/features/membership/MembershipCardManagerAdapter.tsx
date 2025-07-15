import React from "react";
import { Member } from "@shared/member";
import MembershipCardManagerModular from "./components/MembershipCardManagerModular";
import { useAuth } from "../../context/AuthContext";

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
  // Dohvaćamo korisničku ulogu iz AuthContext-a ako nije eksplicitno proslijeđena
  const auth = useAuth();
  
  // Koristimo userRole iz propsa ako je dostupan, inače koristimo ulogu iz AuthContext-a
  // Ovo je konačno rješenje koje osigurava da userRole nikad nije undefined
  const effectiveUserRole = userRole || (auth.user ? auth.user.role : null) || 'member_administrator';
  
  return (
    <MembershipCardManagerModular
      member={member}
      onUpdate={onUpdate}
      userRole={effectiveUserRole}
      isFeeCurrent={isFeeCurrent}
      hideTitle={hideTitle}
    />
  );
};

export default MembershipCardManagerAdapter;
