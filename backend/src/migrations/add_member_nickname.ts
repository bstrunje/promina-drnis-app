import { Pool } from 'pg';
import db from '../utils/db.js';

/**
 * Dodavanje polja "nickname" u tablicu "members"
 */
export async function addMemberNicknameField(): Promise<void> {
  try {
    console.log('Pokretanje migracije: add_member_nickname...');
    
    // Dodavanje polja nickname u tablicu members
    await db.query(`
      ALTER TABLE members 
      ADD COLUMN IF NOT EXISTS nickname VARCHAR(50)
    `);
    
    console.log('Migracija add_member_nickname uspješno završena.');
  } catch (error) {
    console.error('Greška prilikom izvođenja migracije add_member_nickname:', error);
    throw error;
  }
}
