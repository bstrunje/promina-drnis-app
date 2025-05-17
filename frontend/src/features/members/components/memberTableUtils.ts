import { MemberWithDetails } from "@shared/memberDetails.types";
import { DetailedMembershipStatus, findLastEndedPeriod, hasActiveMembershipPeriod, MembershipPeriod } from "@shared/memberStatus.types";

// Funkcija za filtriranje članova s obojenim retcima
export function filterOnlyColoredRows(members: MemberWithDetails[]) {
  return members.filter((member) => {
    // Dohvati status člana
    const displayStatus = getMembershipDisplayStatusExternal(
      member.detailedStatus,
      false, // isAdmin
      false, // isSuperuser
      member.membership_type,
      member.periods
    );

    // Samo za redovne članove primijeni bojanje prema životnom statusu
    if (displayStatus === "Redovni član") {
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
  periods?: MembershipPeriod[]
): string {
  if (!detailedStatus) return "";

  if (periods && !hasActiveMembershipPeriod(periods)) {
    const lastEnded = findLastEndedPeriod(periods);
    if (lastEnded) return "Bivši član";
  }

  if (detailedStatus.status === "pending") {
    return "Na čekanju";
  }
  if (detailedStatus.status === "registered" && membershipType === "regular") {
    return "Redovni član";
  }
  if (detailedStatus.status === "registered" && membershipType === "honorary") {
    return "Počasni član";
  }
  if (
    detailedStatus.status === "registered" &&
    membershipType === "supporting"
  ) {
    return "Podržavajući član";
  }
  if (detailedStatus.status === "inactive") {
    return "Bivši član";
  }
  return "";
}
