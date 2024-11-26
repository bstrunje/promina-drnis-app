// src/scripts/runMigration.ts
import db from '../utils/db.js';
import fs from 'fs';
import path from 'path';

const migrationDir = path.join(process.cwd(), 'src/migrations');

async function runMigration() {
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');
        console.log('Starting user tables cleanup...');
        
        const migrationSQL = fs.readFileSync(
            path.join(migrationDir, 'remove_users.sql'),
            'utf8'
        );

        const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
        
        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];
            if (stmt.trim()) {
                console.log(`Executing statement ${i + 1}/${statements.length}`);
                await client.query(stmt);
            }
        }

        await client.query('COMMIT');
        console.log('User tables cleanup completed successfully!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', error);
        throw error;
    } finally {
        client.release();
    }
}

runMigration()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });