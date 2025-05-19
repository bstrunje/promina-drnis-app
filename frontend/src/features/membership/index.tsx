import React from 'react';
import MembershipCardManagerModular from './components/MembershipCardManagerModular';
import MembershipPeriodsSection from './components/MembershipPeriodsSection';

// Export all components and hooks for easy import elsewhere
export { default as MembershipCardManagerModular } from './components/MembershipCardManagerModular';
export { default as MembershipPeriodsSection } from './components/MembershipPeriodsSection';
export { default as CardNumberSection } from './components/CardNumberSection';
export { default as StampManagementSection } from './components/StampManagementSection';
export { default as PeriodFormRow } from './components/PeriodFormRow';

// Export hookova je sada centraliziran u membershipHooks.ts radi Fast Refresh best practice

// Export types

/**
 * MembershipManager - Komponenta koja kombinira upravljanje članskom karticom i povijesti članstva
 * 
 * Ova komponenta služi kao glavna komponenta za upravljanje članstvom i kombinira
 * MembershipCardManagerModular i MembershipPeriodsSection komponente za potpuno
 * rješenje upravljanja članstvom.
 */
import { Member } from '@shared/member';

interface MembershipManagerProps {
  member: Member;
  onUpdate: (member: Member) => Promise<void>;
  userRole?: string;
  isFeeCurrent?: boolean;
}

export const MembershipManager: React.FC<MembershipManagerProps> = ({
  member,
  onUpdate,
  userRole,
  isFeeCurrent = true,
}) => {
  return (
    <div className="space-y-6">
      {/* Komponenta za upravljanje članskom karticom */}
      <MembershipCardManagerModular
        member={member}
        onUpdate={onUpdate}
        userRole={userRole}
        isFeeCurrent={isFeeCurrent}
      />

      {/* Komponenta za prikaz i upravljanje povijesti članstva */}
      <MembershipPeriodsSection
        member={member}
        periods={member.membership_history?.periods ?? []} // koristi nullish coalescing
        feePaymentYear={member.membership_details?.fee_payment_year}
        feePaymentDate={member.membership_details?.fee_payment_date}
        onUpdatePeriods={async (periods) => {
          // Ažuriraj člana s novim periodima
          await onUpdate({
            ...member,
            membership_history: { periods },
          });
        }}
        onUpdate={onUpdate}
        userRole={userRole}
      />
    </div>
  );
};

export default MembershipManager;
