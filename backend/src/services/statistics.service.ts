import { differenceInMinutes } from 'date-fns';
import prisma from '../utils/prisma.js';

// Tip za Prisma transakcijski klijent
type TransactionClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

/**
 * Izračunava i ažurira godišnju statistiku za određenog člana.
 * Ova funkcija dohvaća sve relevantne aktivnosti za člana u zadanoj godini,
 * izračunava ukupan broj aktivnosti i priznatih sati, te sprema rezultat
 * u `annual_statistics` tablicu koristeći `upsert` operaciju.
 *
 * @param memberId ID člana za kojeg se ažurira statistika.
 * @param year Godina za koju se ažurira statistika.
 * @param tx Opcionalni Prisma transakcijski klijent.
 */
export const updateAnnualStatistics = async (memberId: number, year: number, tx: TransactionClient = prisma) => {
  // 1. Dohvati sve završene aktivnosti za člana u toj godini
  const participations = await tx.activityParticipation.findMany({
    where: {
      member_id: memberId,
      activity: {
        status: 'COMPLETED',
        start_date: {
          gte: new Date(`${year}-01-01T00:00:00.000Z`),
          lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
        },
      },
    },
    include: {
      activity: {
        select: {
          actual_start_time: true,
          actual_end_time: true,
          recognition_percentage: true, // Dohvaćamo i postotak priznavanja s aktivnosti
        },
      },
    },
  });

  // 2. Izračunaj ukupne sate i broj aktivnosti
  const totalActivities = participations.length;
  const totalHours = participations.reduce((acc, p) => {
    let minuteValue = 0;

    if (p.manual_hours !== null && p.manual_hours !== undefined) {
      minuteValue = p.manual_hours * 60; // Pretvaramo sate u minute
    } else if (p.activity.actual_start_time && p.activity.actual_end_time) {
      const minutes = differenceInMinutes(
        new Date(p.activity.actual_end_time),
        new Date(p.activity.actual_start_time)
      );
      minuteValue = minutes > 0 ? minutes : 0;
    }

    // Odredi koji postotak primijeniti. Prioritet ima `recognition_override` s pojedinog sudjelovanja.
    // Ako on ne postoji, koristi se `recognition_percentage` s cijele aktivnosti.
    // Ako ni on ne postoji, default je 100%.
    const finalRecognitionPercentage = p.recognition_override ?? p.activity.recognition_percentage ?? 100;
    const recognizedMinutes = minuteValue * (finalRecognitionPercentage / 100);

    return acc + recognizedMinutes;
  }, 0) / 60; // Vraćamo natrag u sate

  // 3. Spremi (ili ažuriraj) statistiku u bazu
  await (tx || prisma).annualStatistics.upsert({
    where: {
      member_id_year: {
        member_id: memberId,
        year: year,
      },
    },
    update: {
      total_hours: totalHours,
      total_activities: totalActivities,
      calculated_at: new Date(),
    },
    create: {
      member_id: memberId,
      year: year,
      total_hours: totalHours,
      total_activities: totalActivities,
      membership_status: '', // TODO: Ovdje treba dohvatiti i postaviti stvarni status članstva
      calculated_at: new Date(),
    },
  });

  console.log(`Ažurirana statistika za člana ${memberId} za godinu ${year}. Sati: ${totalHours.toFixed(2)}, Aktivnosti: ${totalActivities}`);
};
