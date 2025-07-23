import { MemberWithDetails } from "@shared/memberDetails.types";
import { DetailedMembershipStatus, findLastEndedPeriod, hasActiveMembershipPeriod, MembershipPeriod } from "@shared/memberStatus.types";

// Funkcija za filtriranje članova s obojenim retcima
export function filterOnlyColoredRows(members: MemberWithDetails[], t?: (key: string) => string) {
  return members.filter((member) => {
    // Dohvati status člana
    const status = getMembershipDisplayStatusExternal(
      member.detailedStatus,
      false, // isAdmin
      false, // isSuperuser
      member.membership_type,
      member.periods,
      t
    );

    // Samo za redovne članove primijeni bojanje prema životnom statusu
    if (status.key === 'regularMember') {
      const lifeStatus = member.life_status;

      // Vrati true ako član ima životni status koji rezultira bojanjem
      return (
        lifeStatus === "employed/unemployed" ||
        lifeStatus === "child/pupil/student" ||
        lifeStatus === "pensioner"
      );
    }

    return false;
  });
}

// Funkcija za filtriranje članova koji imaju člansku iskaznicu
export function filterOnlyWithCardNumber(members: MemberWithDetails[]) {
  return members.filter(
    (member) =>
      member.membership_details?.card_number !== undefined &&
      member.membership_details?.card_number !== null &&
      member.membership_details?.card_number !== ""
  );
}

// Helper funkcija za vanjsko određivanje statusa članstva bez pristupa komponentnim stanjima
export function getMembershipDisplayStatusExternal(
  detailedStatus: DetailedMembershipStatus | undefined,
  isAdmin: boolean,
  isSuperuser: boolean,
  membershipType?: string,
  periods?: MembershipPeriod[],
  t?: (key: string) => string
): { key: string; displayText: string } {
    if (!detailedStatus) return { key: "unknown", displayText: "" };

  // Fallback funkcija ako t nije proslijeđena (za backward compatibility)
  const translate = t || ((key: string) => {
    const fallbacks: Record<string, string> = {
      'membershipStatus.pending': 'Na čekanju',
      'membershipStatus.regularMember': 'Redovni član',
      'membershipStatus.honoraryMember': 'Počasni član',
      'membershipStatus.supportingMember': 'Podržavajući član',
      'membershipStatus.formerMember': 'Bivši član'
    };
    return fallbacks[key] || key;
  });

    if (periods && !hasActiveMembershipPeriod(periods)) {
    const lastEnded = findLastEndedPeriod(periods);
    if (lastEnded) return { key: 'formerMember', displayText: translate('membershipStatus.formerMember') };
  }

    if (detailedStatus.status === "pending") {
    return { key: 'pending', displayText: translate('membershipStatus.pending') };
  }
    if (detailedStatus.status === "registered" && membershipType === "regular") {
    return { key: 'regularMember', displayText: translate('membershipStatus.regularMember') };
  }
    if (detailedStatus.status === "registered" && membershipType === "honorary") {
    return { key: 'honoraryMember', displayText: translate('membershipStatus.honoraryMember') };
  }
    if (
    detailedStatus.status === "registered" &&
    membershipType === "supporting"
  ) {
    return { key: 'supportingMember', displayText: translate('membershipStatus.supportingMember') };
  }
    if (detailedStatus.status === "inactive") {
    return { key: 'formerMember', displayText: translate('membershipStatus.formerMember') };
  }
  return { key: "unknown", displayText: "" };
}
