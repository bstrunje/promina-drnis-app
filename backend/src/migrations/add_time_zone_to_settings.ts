// migrations/add_time_zone_to_settings.ts
import db from '../utils/db.js';

/**
 * Migracija koja dodaje time_zone kolonu u tablicu system_settings
 * Početna vrijednost je 'Europe/Zagreb'
 */
export async function addTimeZoneToSettings() {
  try {
    // Prvo provjeri postoji li kolona time_zone u postojećoj tablici system_settings
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'system_settings' 
      AND column_name = 'time_zone'
    `;
    
    const columnResult = await db.query(checkColumnQuery);
    const columnExists = columnResult.rows.length > 0;
    
    if (!columnExists) {
      console.log('Izvršavam migraciju: Dodavanje time_zone kolone u tablicu system_settings');
      
      // Dodaj kolonu time_zone
      const alterQuery = `
        ALTER TABLE system_settings
        ADD COLUMN time_zone TEXT DEFAULT 'Europe/Zagreb'
      `;
      
      await db.query(alterQuery);
      
      // Postavi vrijednost za postojeće zapise
      const updateQuery = `
        UPDATE system_settings
        SET time_zone = 'Europe/Zagreb'
        WHERE time_zone IS NULL
      `;
      
      await db.query(updateQuery);
      
      console.log('Migracija uspješno izvršena: time_zone kolona dodana u tablicu system_settings');
      return { success: true, message: 'time_zone kolona dodana u system_settings' };
    } else {
      console.log('Migracija preskočena: time_zone kolona već postoji u tablici system_settings');
      return { success: true, message: 'time_zone kolona već postoji' };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Greška prilikom dodavanja time_zone kolone:', errorMessage);
    return { success: false, message: `Greška prilikom dodavanja time_zone kolone: ${errorMessage}` };
  }
}
