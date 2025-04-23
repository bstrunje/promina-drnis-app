import db from "../utils/db.js";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Popravlja ograničenje jedinstvenog ključa na stamp_inventory tablici
 * tako da umjesto samo stamp_type, jedinstveni ključ bude kombinacija stamp_type i stamp_year
 */
export async function runMigration(): Promise<boolean> {
  console.log('🔍 Popravljam ograničenje jedinstvenog ključa na stamp_inventory tablici...');
  
  try {
    // Provjeri postoji li ograničenje
    const checkConstraintResult = await db.query(`
      SELECT conname 
      FROM pg_constraint 
      WHERE conname = 'stamp_type_unique'
    `);
    
    if (checkConstraintResult.rows.length === 0) {
      console.log('✅ Ograničenje stamp_type_unique ne postoji ili je već popravljeno');
      return true;
    }
    
    // Ukloni postojeće ograničenje
    await db.query(`
      ALTER TABLE stamp_inventory 
      DROP CONSTRAINT IF EXISTS stamp_type_unique
    `);
    
    console.log('✅ Uklonjeno ograničenje stamp_type_unique');
    
    // Dodaj novo ograničenje koje uključuje obje kolone
    await db.query(`
      ALTER TABLE stamp_inventory 
      ADD CONSTRAINT stamp_type_year_unique UNIQUE (stamp_type, stamp_year)
    `);
    
    console.log('✅ Dodano novo ograničenje stamp_type_year_unique na kombinaciji (stamp_type, stamp_year)');
    
    return true;
  } catch (error) {
    console.error('❌ Greška prilikom popravljanja ograničenja:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

export default { runMigration };
