// src/runMigrations.ts
import { runMigration as addMissingColumns } from './migrations/add_missing_columns.js';

/**
 * Pokreće sve migracije koje su potrebne za aplikaciju
 */
export async function runAllMigrations(): Promise<boolean> {
  console.log('🚀 Pokretanje svih migracija...');
  
  try {
    // Pokreći migracije po redu
    const missingColumnsMigration = await addMissingColumns();
    
    // Ovdje možemo dodati više migracija u budućnosti, kao:
    // await newMigration();
    
    return missingColumnsMigration;
  } catch (error) {
    console.error('❌ Greška prilikom izvršavanja migracija:', error);
    return false;
  }
}
