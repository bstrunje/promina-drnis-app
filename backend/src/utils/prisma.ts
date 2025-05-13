import { PrismaClient } from '@prisma/client';
// Inicijalizacija Prisma klijenta s dodatnim postavkama za kodiranje
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Ova funkcija se može koristiti za dodatne inicijalizijske korake
const initializePrisma = async () => {
  // Prisma će koristiti postavke iz DATABASE_URL-a
  return prisma;
};

export default prisma;
