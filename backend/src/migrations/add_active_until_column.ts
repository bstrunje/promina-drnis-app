import db from "../utils/db.js";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Dodaje active_until stupac u membership_details tablicu
 */
export async function runMigration(): Promise<boolean> {
  console.log('🔍 Provjeravam postoji li active_until kolona u membership_details tablici...');
  
  try {
    // Provjeri postoji li kolona
    const checkColumnResult = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'membership_details' AND column_name = 'active_until'
    `);
    
    if (checkColumnResult.rows.length > 0) {
      console.log('✅ Kolona active_until već postoji u membership_details tablici');
      return true;
    }
    
    // Ako kolona ne postoji, dodaj je
    await db.query(`
      ALTER TABLE membership_details 
      ADD COLUMN active_until TIMESTAMP
    `);
    
    console.log('✅ Kolona active_until uspješno dodana u membership_details tablicu');
    
    // Inicijaliziraj vrijednosti na temelju fee_payment_year
    await db.query(`
      UPDATE membership_details
      SET active_until = CASE 
        WHEN fee_payment_year IS NULL THEN NULL
        ELSE MAKE_DATE(fee_payment_year, 12, 31)
      END
    `);
    
    console.log('✅ Inicijalizirana active_until polja na temelju fee_payment_year');
    return true;
  } catch (error) {
    console.error('❌ Greška prilikom dodavanja active_until kolone:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

export default { runMigration };
