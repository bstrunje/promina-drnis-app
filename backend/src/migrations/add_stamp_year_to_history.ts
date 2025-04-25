// migrations/add_stamp_year_to_history.ts
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
 * Migracija za dodavanje stamp_year kolone u stamp_history tablicu
 * 
 * Ova migracija rješava problem s arhiviranjem i resetiranjem inventara markica
 * dodavanjem stamp_year kolone koja je potrebna za pravilno funkcioniranje
 * Reset Year funkcionalnosti
 */
export async function runMigration(): Promise<boolean> {
  console.log('🔄 Pokretanje migracije za dodavanje stamp_year kolone u stamp_history tablicu...');
  
  try {
    // Provjeravamo postoji li stamp_year kolona u stamp_history tablici
    const stampYearExists = await columnExists('stamp_history', 'stamp_year');
    if (!stampYearExists) {
      console.log('➕ Dodavanje nedostajuće kolone stamp_year u stamp_history tablicu...');
      await db.query(`
        ALTER TABLE stamp_history 
        ADD COLUMN IF NOT EXISTS stamp_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)
      `);
      console.log('✅ Kolona stamp_year uspješno dodana u stamp_history tablicu');
      
      // Također, dodajemo podršku za automatsko popunjavanje stamp_year na temelju year kolone za postojeće zapise
      await db.query(`
        UPDATE stamp_history
        SET stamp_year = year
        WHERE stamp_year = EXTRACT(YEAR FROM CURRENT_DATE)
      `);
      console.log('✅ Postojeći zapisi ažurirani da koriste year vrijednost kao stamp_year');
    } else {
      console.log('✅ Kolona stamp_year već postoji u stamp_history tablici');
    }
    
    // Bilježimo podatke o migraciji
    const migrationRecord: MigrationRecord = {
      name: 'add_stamp_year_to_history',
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
      name: 'add_stamp_year_to_history',
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
