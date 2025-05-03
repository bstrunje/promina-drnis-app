import db from '../utils/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log file path
const logFilePath = path.resolve(__dirname, '../../logs/migrations.log');

// Function to log messages
const logMessage = (message: string) => {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} - ${message}\n`;
  
  fs.appendFileSync(logFilePath, logEntry);
  console.log(message);
};

/**
 * Migracijska skripta za dodavanje polja za smjer poruka u tablicu member_messages
 * Dodaje polja: sender_id, recipient_id, recipient_type, sender_type
 */
export const addMessageDirectionFields = async (): Promise<void> => {
  try {
    // Provjeri postoji li stupac 'sender_id' u tablici 'member_messages'
    const columnCheckResult = await db.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'member_messages' AND column_name = 'sender_id'
    `);

    // Ako stupac već postoji, preskočimo migraciju
    if (columnCheckResult.rowCount !== null && columnCheckResult.rowCount > 0) {
      logMessage('Migracija add_message_direction_fields: Stupci za smjer poruka već postoje.');
      return;
    }

    // Započnimo transakciju za sve promjene
    await db.query('BEGIN');

    // Dodaj stupce za smjer poruka
    await db.query(`
      ALTER TABLE member_messages
      ADD COLUMN IF NOT EXISTS sender_id INTEGER,
      ADD COLUMN IF NOT EXISTS recipient_id INTEGER,
      ADD COLUMN IF NOT EXISTS recipient_type VARCHAR(10) DEFAULT 'admin',
      ADD COLUMN IF NOT EXISTS sender_type VARCHAR(10) DEFAULT 'member'
    `);

    // Ažuriraj postojeće zapise - postavi sender_id na member_id za stare poruke
    await db.query(`
      UPDATE member_messages
      SET sender_id = member_id,
          sender_type = 'member',
          recipient_type = 'admin'
      WHERE sender_id IS NULL
    `);

    // Završi transakciju
    await db.query('COMMIT');

    logMessage('Migracija add_message_direction_fields: Uspješno dodana polja za smjer poruka u tablicu member_messages.');
  } catch (error) {
    // U slučaju greške, poništi transakciju
    await db.query('ROLLBACK');
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Nepoznata greška prilikom dodavanja polja za smjer poruka';
      
    logMessage(`Migracija add_message_direction_fields GREŠKA: ${errorMessage}`);
    console.error('Greška prilikom migracije:', error);
    
    throw new Error(`Greška prilikom dodavanja polja za smjer poruka: ${errorMessage}`);
  }
};

export default addMessageDirectionFields;
