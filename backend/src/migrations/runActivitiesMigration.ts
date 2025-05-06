// backend/src/migrations/runActivitiesMigration.ts
import { PrismaClient } from '@prisma/client';

interface IndexResult {
    exists: number;
  }

export async function runActivitiesMigration(prisma: PrismaClient) {
  try {
    // Provjera indeksa
    const indexExists = await prisma.$queryRaw<IndexResult[]>`
      SELECT 1 FROM pg_indexes 
      WHERE indexname = 'idx_activities_start_date' 
      AND tablename = 'activities'
    `;

    if (!indexExists?.length) {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX CONCURRENTLY idx_activities_start_date ON activities(start_date);
      `);
    }

    // FK constraint: provjeri i dodaj ako ne postoji
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_participants_activity'
            AND table_name = 'activity_participants'
        ) THEN
          ALTER TABLE activity_participants
            ADD CONSTRAINT fk_participants_activity
            FOREIGN KEY (activity_id) REFERENCES activities(activity_id);
        END IF;
      END
      $$;
    `);

    console.log('Activities migration successfully applied');
  } catch (error) {
    console.error('Error running activities migration:', error);
    throw error;
  }
}