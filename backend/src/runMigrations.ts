// src/runMigrations.ts
import { runMigration as addMissingColumns } from './migrations/add_missing_columns.js';
import { runMigration as addActiveUntilColumn } from './migrations/add_active_until_column.js';
import { runMigration as fixStampInventoryConstraint } from './migrations/fix_stamp_inventory_constraint.js';
import { runMigration as addStampYearToHistory } from './migrations/add_stamp_year_to_history.js';
import { addMessageDirectionFields } from './migrations/add_message_direction_fields.js';
import { addMemberNicknameField } from './migrations/add_member_nickname.js';
import { addSystemAdminTable } from './migrations/add_system_admin_table.js';
import { addTimeZoneToSettings } from './migrations/add_time_zone_to_settings.js';

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
    await addStampYearToHistory(); // Dodana migracija za dodavanje stamp_year kolone u stamp_history tablicu
    await addMessageDirectionFields(); // Dodana migracija za podršku dvosmjernih poruka
    await addMemberNicknameField(); // Dodana migracija za polje nadimka (nickname) članova
    await addSystemAdminTable(); // Dodana migracija za system_admin tablicu i proširenje AdminPermissions modela
    await addTimeZoneToSettings(); // Dodana migracija za vremensku zonu u postavkama
    
    console.log('✅ Migracije uspješno izvršene');
  } catch (error) {
    console.error('❌ Greška prilikom izvršavanja migracija:', error);
    throw error;
  }
}

export default { runAllMigrations };
