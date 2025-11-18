import { differenceInMinutes } from 'date-fns';
import prisma from '../utils/prisma.js';

const isDev = process.env.NODE_ENV === 'development';

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
  // 0. Dohvati člana da bi dobili organization_id
  const member = await tx.member.findUnique({
    where: { member_id: memberId },
    select: { organization_id: true }
  });
  
  if (!member) {
    if (isDev) console.warn(`Član ${memberId} nije pronađen - preskačem ažuriranje statistike`);
    return;
  }
  
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
          manual_hours: true, // Dohvaćamo i sate s razine aktivnosti
          actual_start_time: true,
          actual_end_time: true,
          recognition_percentage: true,
        },
      },
    },
  });

  // 2. Izračunaj ukupne sate i broj aktivnosti
  const totalActivities = participations.length;
  const totalRecognizedMinutes = participations.reduce((acc, p) => {
    let minuteValue = 0;

    // PRIORITET 1: Individualni prilagođeni sati sudionika (participation.manual_hours)
    // Ovo su konačni sati nakon svih prilagodbi i najvažniji su
    if (p.manual_hours !== null && p.manual_hours !== undefined && Number(p.manual_hours) > 0) {
      minuteValue = Number(p.manual_hours) * 60;
    // PRIORITET 2: Ručno uneseni sati na razini aktivnosti (activity.manual_hours)
    } else if (p.activity.manual_hours !== null && p.activity.manual_hours !== undefined && Number(p.activity.manual_hours) > 0) {
      minuteValue = Number(p.activity.manual_hours) * 60;
    // PRIORITET 3: Automatski izračun iz stvarnog vremena
    } else if (p.activity.actual_start_time && p.activity.actual_end_time) {
      const minutes = differenceInMinutes(
        new Date(p.activity.actual_end_time),
        new Date(p.activity.actual_start_time)
      );
      minuteValue = minutes > 0 ? minutes : 0;
    }

    const finalRecognitionPercentage = p.recognition_override ?? p.activity.recognition_percentage ?? 100;
    const recognizedMinutes = minuteValue * (finalRecognitionPercentage / 100);

    return acc + recognizedMinutes;
  }, 0);

  const totalHours = totalRecognizedMinutes / 60; // Pretvaramo ukupne minute u sate

  // 3. Spremi (ili ažuriraj) statistiku u bazu - ili obriši ako nema aktivnosti
  if (totalActivities === 0 && totalHours === 0) {
    // Ako nema aktivnosti, obriši postojeći zapis godišnje statistike
    await (tx || prisma).annualStatistics.deleteMany({
      where: {
        member_id: memberId,
        year: year,
      },
    });
    
    if (isDev) console.log(`Obrisana prazna statistika za člana ${memberId} za godinu ${year}`);
  } else {
    // Ako ima aktivnosti, ažuriraj ili kreiraj statistiku
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
        organization_id: member.organization_id,
        member_id: memberId,
        year: year,
        total_hours: totalHours,
        total_activities: totalActivities,
        membership_status: '', // TODO: Ovdje treba dohvatiti i postaviti stvarni status članstva
        calculated_at: new Date(),
      },
    });

    if (isDev) console.log(`Ažurirana statistika za člana ${memberId} za godinu ${year}. Sati: ${totalHours.toFixed(2)}, Aktivnosti: ${totalActivities}`);
  }
};

/**
 * Briše sve prazne godišnje statistike za određenog člana.
 * Ova funkcija se poziva kada se briše aktivnost da očisti sve godine
 * gdje član više nema aktivnosti.
 * 
 * @param memberId ID člana za kojeg se brišu prazne statistike.
 * @param tx Opcionalni Prisma transakcijski klijent.
 */
export const cleanupEmptyAnnualStatistics = async (memberId: number, tx: TransactionClient = prisma) => {
  // Obriši sve zapise gdje član nema aktivnosti ili sate
  const deletedCount = await (tx || prisma).annualStatistics.deleteMany({
    where: {
      member_id: memberId,
      total_activities: 0,
      total_hours: 0,
    },
  });

  if (isDev) console.log(`Obrisano ${deletedCount.count} praznih statistika za člana ${memberId}`);
  
  return deletedCount;
};
