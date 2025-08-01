import { PrismaClient } from '@prisma/client';

// Optimizirana Prisma konfiguracija za Vercel serverless okruženje
const prisma = new PrismaClient({
  // Smanji logging u produkciji za bolje performanse
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  
  // Optimizacije za serverless okruženje
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Graceful shutdown za serverless funkcije
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

// Ova funkcija se može koristiti za dodatne inicijalizijske korake
const initializePrisma = async () => {
  // Prisma će koristiti postavke iz DATABASE_URL-a
  return prisma;
};

export default prisma;
