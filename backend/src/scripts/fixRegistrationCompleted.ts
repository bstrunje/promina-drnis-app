// backend/src/scripts/fixRegistrationCompleted.ts
// Skripta: Postavlja member.registration_completed = true za sve članove koji ispunjavaju uvjete
// Uvjeti:
// - ima dodijeljen broj članske iskaznice (membership_details.card_number != '')
// - plaćeno za tekuću godinu (membership_details.fee_payment_year = currentYear)
// - izdana markica za tekuću godinu (membership_details.card_stamp_issued = true)
// - ima aktivan period (postoji membershipPeriod s end_date = null)
// Napomena: Ne mijenja se postojeći API ugovor ni Prisma shema; ovo je jednokratan batch update.

import prisma from "../utils/prisma.js";
import { getCurrentDate } from "../utils/dateUtils.js";

async function main() {
  // Odredi tekuću godinu prema util funkciji (kompatibilno s Time Travelerom)
  const currentYear = getCurrentDate().getFullYear();

  console.log(`[FIX] Pokrećem batch ažuriranje za tekuću godinu: ${currentYear}`);

  // Prvo pronađi članove koji ispunjavaju uvjete i trenutno imaju registration_completed = false (ili null)
  const candidates = await prisma.member.findMany({
    where: {
      OR: [
        { registration_completed: false },
        { registration_completed: null as unknown as boolean },
      ],
      membership_details: {
        card_number: { not: "" },
        fee_payment_year: currentYear,
        card_stamp_issued: true,
      },
      periods: {
        some: { end_date: null },
      },
    },
    select: { member_id: true, organization_id: true },
  });

  if (candidates.length === 0) {
    console.log("[FIX] Nema kandidata za ažuriranje. Nije napravljena nikakva promjena.");
    return;
  }

  // Ažuriraj sve kandidate u jednom potezu preko updateMany s istim uvjetima
  const updateResult = await prisma.member.updateMany({
    where: {
      OR: [
        { registration_completed: false },
        { registration_completed: null as unknown as boolean },
      ],
      membership_details: {
        card_number: { not: "" },
        fee_payment_year: currentYear,
        card_stamp_issued: true,
      },
      periods: {
        some: { end_date: null },
      },
    },
    data: {
      registration_completed: true,
      // Po potrebi se može uključiti i status='registered', ali to nije traženo
      // status: 'registered'
    },
  });

  console.log(`[FIX] Ažurirano članova: ${updateResult.count}`);

  // Dodatna dijagnostika po organizacijama (opcionalno):
  const perOrg = new Map<number, number>();
  for (const c of candidates) {
    // organization_id može biti tipiziran kao number | null ⇒ zaštita od null
    if (c.organization_id !== null && c.organization_id !== undefined) {
      perOrg.set(c.organization_id, (perOrg.get(c.organization_id) ?? 0) + 1);
    }
  }
  for (const [orgId, count] of perOrg) {
    console.log(`[FIX] Org ${orgId}: kandidata = ${count}`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("[FIX] Gotovo.");
  })
  .catch(async (e) => {
    console.error("[FIX] Greška:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
