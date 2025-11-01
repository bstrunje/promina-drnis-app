import { PrismaClient } from '@prisma/client';

// Global Prisma instance za serverless okruženje
let prisma: PrismaClient;

const isDev = process.env.NODE_ENV === 'development';

// Optimizirana Prisma konfiguracija za Vercel serverless okruženje s connection pooling
if (process.env.VERCEL) {
  if (isDev) console.log('[PRISMA] Inicijalizacija za Vercel serverless okruženje');
  if (isDev) console.log('[PRISMA] DATABASE_URL postoji:', !!process.env.DATABASE_URL);
  if (isDev) console.log('[PRISMA] DATABASE_URL duljina:', process.env.DATABASE_URL?.length || 0);
  
  // KRITIČNA OPTIMIZACIJA: Connection pooling za serverless
  const connectionString = process.env.DATABASE_URL;
  const pooledConnectionString = connectionString?.includes('?') 
    ? `${connectionString}&connection_limit=5&pool_timeout=60&pgbouncer=true`
    : `${connectionString}?connection_limit=5&pool_timeout=60&pgbouncer=true`;
  
  if (isDev) console.log('[PRISMA] Koristi connection pooling za serverless');
  
  // Vercel serverless optimizacije s connection pooling
  prisma = new PrismaClient({
    log: ['error', 'warn'], // Dodano warn za debug
    datasources: {
      db: {
        url: pooledConnectionString,
      },
    },
    // Dodatne serverless optimizacije
    transactionOptions: {
      timeout: 5000, // 5 sekundi timeout za transakcije
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

// Test konekcije prema bazi za debug
export const testDatabaseConnection = async () => {
  const startTime = Date.now();
  try {
    if (isDev) console.log('[PRISMA] Testiranje konekcije prema bazi...');
    await prisma.$queryRaw`SELECT 1 as test`;
    const duration = Date.now() - startTime;
    if (isDev) console.log(`[PRISMA] Konekcija uspješna - ${duration}ms`);
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[PRISMA] Konekcija neuspješna nakon ${duration}ms:`, error);
    return false;
  }
};

// Warm-up funkcija za smanjenje cold start latency
export const warmUpPrisma = async () => {
  if (process.env.VERCEL) {
    try {
      const connected = await testDatabaseConnection();
      if (connected) {
        if (isDev) console.log('[PRISMA] Warm-up uspješan');
        // Dodatni query warmup za najčešće korištene operacije
        await warmUpCommonQueries();
      } else {
        console.error('[PRISMA] Warm-up neuspješan - nema konekcije');
      }
    } catch (error) {
      console.error('[PRISMA] Warm-up neuspješan:', error);
    }
  }
};

// Query warmup za najčešće korištene operacije
export const warmUpCommonQueries = async () => {
  if (process.env.VERCEL) {
    try {
      // Pripremi najčešće korištene querije za System Manager
      await Promise.all([
        prisma.member.count(), // Warmup za member tablice
        prisma.organization.findMany({ take: 5 }), // Warmup za organization lookup
        prisma.systemManager.findMany({ take: 1 }), // Warmup za auth operacije
        prisma.auditLog.findMany({ take: 1 }) // Warmup za audit logove
      ]);
      if (isDev) console.log('[PRISMA] Query warmup uspješan');
    } catch (error) {
      console.warn('[PRISMA] Query warmup failed:', error);
      // Ne bacamo error jer warmup failure ne smije spriječiti aplikaciju
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
export { initializePrisma };
