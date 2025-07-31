// backend/src/run-setup.ts
import { PrismaClient } from '@prisma/client';
import { createInitialSystemManagerIfNeeded } from './setupDatabase.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Running database setup...');
  try {
    await prisma.$transaction(async (tx) => {
      await createInitialSystemManagerIfNeeded(tx);
    });
    console.log('Database setup completed successfully.');
  } catch (error) {
    console.error('Error during database setup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
