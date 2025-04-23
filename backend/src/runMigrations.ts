// src/runMigrations.ts
import { runMigration as addMissingColumns } from './migrations/add_missing_columns.js';
import { runMigration as addActiveUntilColumn } from './migrations/add_active_until_column.js';
import { runMigration as fixStampInventoryConstraint } from './migrations/fix_stamp_inventory_constraint.js';

/**
 * Pokreće sve migracije koje su potrebne za aplikaciju
 */
export async function runAllMigrations(): Promise<void> {
  console.log('🚀 Pokretanje migracija...');
  
  try {
    // Redoslijed izvršavanja migracija - dodajte nove migracije ovdje
    await addMissingColumns();
    await addActiveUntilColumn(); 
    await fixStampInventoryConstraint(); // Dodana nova migracija za popravak ograničenja
    
    console.log('✅ Migracije uspješno izvršene');
  } catch (error) {
    console.error('❌ Greška prilikom izvršavanja migracija:', error);
    throw error;
  }
}

export default { runAllMigrations };
