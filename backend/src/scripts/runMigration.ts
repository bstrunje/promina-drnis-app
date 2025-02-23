import db from '../utils/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationDir = path.join(__dirname, '../migrations');

async function runMigration() {
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');
        console.log('Starting system settings update...');
        
        // Prvo provjeravamo postoji li kolona
        const checkColumn = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'system_settings' 
            AND column_name = 'renewal_start_month';
        `);

        if (checkColumn.rows.length === 0) {
            console.log('Adding renewal_start_month column...');
            await client.query(`
                ALTER TABLE system_settings 
                ADD COLUMN renewal_start_month INTEGER DEFAULT 11;
            `);
            console.log('Column added successfully!');
        } else {
            console.log('Column renewal_start_month already exists, skipping...');
        }

        await client.query('COMMIT');
        console.log('Migration completed successfully!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', error);
        throw error;
    } finally {
        client.release();
        await db.close();
    }
}

runMigration()
    .then(() => {
        console.log('Migration script completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });