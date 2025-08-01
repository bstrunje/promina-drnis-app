import { PrismaClient } from '@prisma/client';

// Global Prisma instance za serverless okruženje
let prisma: PrismaClient;

// Optimizirana Prisma konfiguracija za Vercel serverless okruženje
if (process.env.VERCEL) {
  // Vercel serverless optimizacije
  prisma = new PrismaClient({
    log: ['error'], // Minimalno logging za performanse
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
} else {
  // Development/lokalno okruženje
  prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
}

// Graceful shutdown za serverless funkcije
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

// Warm-up funkcija za serverless okruženje
const warmUpPrisma = async () => {
  if (process.env.VERCEL) {
    try {
      // Jednostavan upit za "zagrijavanje" konekcije
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ Prisma connection warmed up');
    } catch (error) {
      console.warn('⚠️ Prisma warm-up failed:', error);
    }
  }
};

// Ova funkcija se može koristiti za dodatne inicijalizijske korake
const initializePrisma = async () => {
  // Prisma će koristiti postavke iz DATABASE_URL-a
  await warmUpPrisma();
  return prisma;
};

// Auto warm-up u serverless okruženju
if (process.env.VERCEL) {
  warmUpPrisma();
}

export default prisma;
export { initializePrisma, warmUpPrisma };
