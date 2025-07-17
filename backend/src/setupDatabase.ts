import { Prisma } from '@prisma/client';
import prisma from './utils/prisma.js';
import bcrypt from 'bcrypt';

/**
 * Kreira početnog system managera ako ne postoji u bazi.
 * Prima Prisma Transaction Client za izvršavanje unutar transakcije.
 */
export async function createInitialSystemManagerIfNeeded(tx: Prisma.TransactionClient): Promise<void> {
  const managerExists = await tx.systemManager.count();
  if (managerExists > 0) {
    console.info('System Manager already exists, skipping creation.');
    return;
  }

  console.info('Creating initial system manager...');
  const username = process.env.INITIAL_SYSTEM_MANAGER_USERNAME || 'systemManager';
  const email = process.env.INITIAL_SYSTEM_MANAGER_EMAIL || 'manager@example.com';
  const defaultPassword = process.env.INITIAL_SYSTEM_MANAGER_PASSWORD || 'password123';
  const display_name = 'System Manager';

  if (!defaultPassword) {
    console.error('Initial system manager password is not set in .env file. Skipping creation.');
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(defaultPassword, salt);

  await tx.systemManager.create({
    data: {
      id: 0,
      username,
      email,
      display_name,
      password_hash,
    },
  });

  console.info(`Initial system manager created with username: ${username}`);
  console.warn('IMPORTANT: Please change the default password after first login!');
}

/**
 * Postavlja osnovne vrste aktivnosti. Koristi `upsert` s `key` poljem.
 * Prima Prisma Transaction Client za izvršavanje unutar transakcije.
 */
export async function setupActivityTypes(tx: Prisma.TransactionClient): Promise<void> {
  console.info('Setting up activity types...');

  const activityTypes = [
    {
      key: 'akcija-drustvo',
      name: 'AKCIJA DRUŠTVO',
      description: 'Radne akcije u organizaciji Društva',
    },
    {
      key: 'akcija-trail',
      name: 'AKCIJA TRAIL',
      description: 'Radne akcije za Trail',
    },
    {
      key: 'dezurstva',
      name: 'DEŽURSTVA',
      description: 'Dežurstva u domu',
    },
    {
      key: 'izleti',
      name: 'IZLETI',
      description: 'Organizacija, vođenje i sudjelovanje na izletima',
    },
    { key: 'razno', name: 'RAZNO', description: 'Ostale razne aktivnosti' },
    { key: 'sastanci', name: 'SASTANCI', description: 'Sastanci članova i upravnog odbora' },
  ];

  const canonicalKeys = activityTypes.map((t) => t.key);

  // Korak 1: Obriši sve vrste aktivnosti koje NISU na kanonskom popisu.
  // Ovo čisti stare ili pogrešne unose bez utjecaja na ispravne.
  await tx.activityType.deleteMany({
    where: {
      key: {
        notIn: canonicalKeys,
      },
    },
  });

  // Korak 2: Koristi upsert kako bi osigurao da sve kanonske vrste aktivnosti postoje i da su ažurirane.
  for (const type of activityTypes) {
    await tx.activityType.upsert({
      where: { key: type.key },
      update: { name: type.name, description: type.description },
      create: { key: type.key, name: type.name, description: type.description },
    });
  }

  console.info('Activity types setup complete.');
}

/**
 * Glavna funkcija za postavljanje početnih podataka u bazi.
 * Sve operacije se izvršavaju unutar jedne transakcije.
 */
export async function setupDatabase() {
  console.info('Starting database setup...');
  try {
    await prisma.$transaction(async (tx) => {
      await createInitialSystemManagerIfNeeded(tx);
      await setupActivityTypes(tx);
    });
    console.info('Database setup completed successfully.');
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
}
