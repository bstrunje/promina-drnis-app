// migrations/add_missing_columns.ts
import db from '../utils/db.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Interface za zapis migracije
 */
interface MigrationRecord {
  name: string;
  executed_at: string;
  success: boolean;
  error?: string;
}

/**
 * Migracija za dodavanje nedostajućih kolona u produkcijsku bazu
 * 
 * Ova migracija dodaje:
 * 1. stamp_year kolonu u stamp_inventory tablicu ako ne postoji
 * 2. next_year_stamp_issued kolonu u membership_details tablicu ako ne postoji
 */
export async function runMigration(): Promise<boolean> {
  console.log('🔄 Pokretanje migracije za dodavanje nedostajućih kolona...');
  
  try {
    // 1. Provjeravamo postoji li stamp_year kolona u stamp_inventory tablici
    const stampYearExists = await columnExists('stamp_inventory', 'stamp_year');
    if (!stampYearExists) {
      console.log('➕ Dodavanje nedostajuće kolone stamp_year u stamp_inventory tablicu...');
      await db.query(`
        ALTER TABLE stamp_inventory 
        ADD COLUMN IF NOT EXISTS stamp_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)
      `);
      console.log('✅ Kolona stamp_year uspješno dodana');
      
      // Dodaj index/unique constraint za stamp_year i stamp_type
      try {
        await db.query(`
          ALTER TABLE stamp_inventory 
          ADD CONSTRAINT stamp_type_year_unique UNIQUE (stamp_type, stamp_year)
        `);
        console.log('✅ Constraint stamp_type_year_unique uspješno dodan');
      } catch (constraintError: any) {
        console.log('⚠️ Constraint stamp_type_year_unique već postoji ili se ne može dodati:', 
          constraintError.message);
      }
    } else {
      console.log('✅ Kolona stamp_year već postoji u stamp_inventory tablici');
    }
    
    // 2. Provjeravamo postoji li next_year_stamp_issued kolona u membership_details tablici
    const nextYearStampExists = await columnExists('membership_details', 'next_year_stamp_issued');
    if (!nextYearStampExists) {
      console.log('➕ Dodavanje nedostajuće kolone next_year_stamp_issued u membership_details tablicu...');
      await db.query(`
        ALTER TABLE membership_details 
        ADD COLUMN IF NOT EXISTS next_year_stamp_issued BOOLEAN DEFAULT false
      `);
      console.log('✅ Kolona next_year_stamp_issued uspješno dodana');
    } else {
      console.log('✅ Kolona next_year_stamp_issued već postoji u membership_details tablici');
    }
    
    // Bilježimo podatke o migraciji
    const migrationRecord: MigrationRecord = {
      name: 'add_missing_columns',
      executed_at: new Date().toISOString(),
      success: true
    };
    
    await logMigration(migrationRecord);
    
    console.log('✅ Migracija uspješno završena');
    return true;
  } catch (error: any) {
    console.error('❌ Greška tijekom migracije:', error);
    
    // Bilježimo neuspješnu migraciju
    const migrationRecord: MigrationRecord = {
      name: 'add_missing_columns',
      executed_at: new Date().toISOString(),
      success: false,
      error: error.message
    };
    
    await logMigration(migrationRecord);
    
    return false;
  }
}

/**
 * Pomoćna funkcija koja provjerava postoji li kolona u tablici
 */
async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await db.query(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = $1 AND column_name = $2
    )
  `, [tableName, columnName]);
  
  return result.rows[0].exists;
}

/**
 * Bilježi podatke o izvršenoj migraciji
 */
async function logMigration(migrationData: MigrationRecord): Promise<void> {
  try {
    // Stvaranje direktorija za log ako ne postoji
    const logDir = path.join(process.cwd(), 'logs');
    await fs.mkdir(logDir, { recursive: true });
    
    const logPath = path.join(logDir, 'migrations.log');
    
    // Dodajemo podatke u log
    await fs.appendFile(
      logPath,
      JSON.stringify(migrationData, null, 2) + ',\n',
      'utf8'
    );
  } catch (error) {
    console.error('Greška prilikom bilježenja migracije:', error);
  }
}

export default { runMigration };
