import prisma from '../utils/prisma.js';

// Briše podatke iz svih tablica koje koristiš u testovima (redoslijed bitan zbog FK constraints)
export async function cleanTestDb() {
  // Prvo pobriši child tablice (redoslijed je bitan zbog FK constrainta)
  await prisma.memberMessage.deleteMany({}); // poruke članova
  await prisma.annualStatistics.deleteMany({}); // godišnja statistika
  await prisma.membershipPeriod.deleteMany({}); // periodi članstva
  await prisma.membershipDetails.deleteMany({}); // detalji članstva
  await prisma.activityParticipant.deleteMany({}); // sudionici aktivnosti
  await prisma.cardNumber.deleteMany({}); // brojevi kartica
  await prisma.refresh_tokens.deleteMany({}); // refresh tokeni
  await prisma.stamp_history.deleteMany({}); // povijest markica
  await prisma.auditLog.deleteMany({}); // audit logovi
  await prisma.adminPermissions.deleteMany({}); // administratorske dozvole
  // Dodaj ostale child tablice po potrebi

  // Zatim pobriši parent tablice
  await prisma.member.deleteMany({}); // članovi
  await prisma.activity.deleteMany({}); // aktivnosti
  await prisma.stampInventory.deleteMany({}); // inventar markica
  await prisma.systemAdmin.deleteMany({}); // sistem administratori
  await prisma.hours.deleteMany({}); // sati
  // Dodaj ostale parent tablice po potrebi
}

