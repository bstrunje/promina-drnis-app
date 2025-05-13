import { MembershipTypeEnum } from "@shared/member.js";

export const membershipTypeLabels: Record<MembershipTypeEnum, string> = {
  [MembershipTypeEnum.Regular]: "Redovni član",
  [MembershipTypeEnum.Honorary]: "Počasni član",
  [MembershipTypeEnum.Supporting]: "Podržavajući član"
};

// Centralizirani prikaz statusa članstva
export const membershipStatusLabels: Record<string, string> = {
  registered: "Aktivan član",
  inactive: "Neaktivan član",
  pending: "Čeka uplatu članarine"
};

// Centralizirani prikaz razloga prekida članstva
export const membershipEndReasonLabels: Record<string, string> = {
  withdrawal: "Vlastiti zahtjev",
  non_payment: "Nepodmirena članarina",
  expulsion: "Isključenje",
  death: "Preminuo",
  inactivity: "Neaktivnost",
  other: "Ostalo"
};

// Centralizirani prikaz statusa aktivnosti
export const activityStatusLabels: Record<string, string> = {
  active: "Aktivan",
  passive: "Pasivan"
};

// Centralizirani prikaz statusa članarine
export const feeStatusLabels: Record<string, string> = {
  current: "Plaćeno",
  "payment required": "Potrebna uplata"
};

// Centralizirane boje za status članarine
export const feeStatusColors: Record<string, string> = {
  current: "bg-green-100 text-green-800",
  "payment required": "bg-red-100 text-red-800"
}; // Dodano radi konzistentnosti prikaza


// Centralizirani prikaz životnog statusa
export const lifeStatusLabels: Record<string, string> = {
  "employed/unemployed": "Zaposlen/Nezaposlen",
  "child/pupil/student": "Dijete/Đak/Student",
  pensioner: "Umirovljenik"
};

import { MembershipPeriod } from "@shared/memberStatus.types.js";
import { MembershipDetails } from "@shared/membership";

/**
 * Dohvati najnoviji period članstva (prema start_date)
 * @param periods - Niz perioda članstva
 * @returns Najnoviji period članstva ili null ako nema perioda
 * @remarks start_date je u ISO string formatu (YYYY-MM-DDTHH:mm:ss.sssZ)
 */
function getLatestPeriod(periods: MembershipPeriod[]): MembershipPeriod | null {
  if (!periods || periods.length === 0) return null;
  return [...periods].sort((a, b) => (b.start_date || "").localeCompare(a.start_date || ""))[0];
}

/**
 * Helper funkcija za prikaz statusa članstva u koloni ČLANSTVO
 * @param membershipType - tip članstva (enum)
 * @param membershipPeriods - svi periodi članstva
 * @param currentYear - trenutna godina
 * @returns string za prikaz
 */
export function getMembershipDisplayLabel(
  membershipType: MembershipTypeEnum,
  membershipPeriods: MembershipPeriod[],
  currentYear: number,
  membershipDetails?: MembershipDetails
): string {
  const latestPeriod = getLatestPeriod(membershipPeriods);

  // Ako NEMA perioda, fallback na tip
  if (!latestPeriod) {
    switch (membershipType) {
      case MembershipTypeEnum.Regular:
        return "Redovni član";
      case MembershipTypeEnum.Honorary:
        return "Počasni član";
      case MembershipTypeEnum.Supporting:
        return "Podržavajući član";
      default:
        return "Nepoznat status";
    }
  }

  // Ako period nema End Date (još traje)
  if (!latestPeriod.end_date) {
    switch (membershipType) {
      case MembershipTypeEnum.Regular:
        return "Redovni član";
      case MembershipTypeEnum.Honorary:
        return "Počasni član";
      case MembershipTypeEnum.Supporting:
        return "Podržavajući član";
      default:
        return "Nepoznat status";
    }
  }

  // Ako period ima End Date (članstvo završeno)
  if (
    membershipType === MembershipTypeEnum.Regular &&
    latestPeriod.end_reason === "non_payment"
  ) {
    const lastPaidYear = (typeof membershipDetails?.fee_payment_year === 'number') ? membershipDetails.fee_payment_year : null;
    if (lastPaidYear === currentYear - 1) {
      return "Članstvo isteklo";
    }
    if (lastPaidYear !== null && lastPaidYear <= currentYear - 2) {
      return "Bivši član";
    }
  }

  // Default za završene periode
  return "Bivši član";
}
