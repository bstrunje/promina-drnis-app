import db from './utils/db.js';

let isInitialized = false;

async function checkTablesExist() {
    const tables = ['users', 'members', 'activities', 'activity_participants', 'annual_statistics'];
    
    for (const table of tables) {
        const result = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = $1
            )
        `, [table]);

        if (!result.rows[0].exists) {
            return false;
        }
    }

    return true;
}

async function setupDatabase() {
    // Prevent multiple initializations
    if (isInitialized) {
        console.log('Database already initialized, skipping setup');
        return;
    }

    try {
        const tablesExist = await checkTablesExist();

        if (tablesExist) {
            console.log('All tables already exist, skipping creation');
            isInitialized = true;
            return;
        }

        // Begin transaction
        await db.query('BEGIN');

        // Users table
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                user_id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                role VARCHAR(20) NOT NULL CHECK (role IN ('member', 'admin', 'superuser')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP
            );
        `);
        console.log('Users table created successfully');

        // Members table
        await db.query(`
            CREATE TABLE IF NOT EXISTS members (
                member_id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(user_id),
                first_name VARCHAR(50) NOT NULL,
                last_name VARCHAR(50) NOT NULL,
                join_date DATE NOT NULL,
                status VARCHAR(20) DEFAULT 'active',
                phone VARCHAR(20),
                emergency_contact VARCHAR(100),
                membership_type VARCHAR(20) DEFAULT 'passive',
                notes TEXT
            );
        `);
        console.log('Members table created successfully');

        // Activities table
        await db.query(`
            CREATE TABLE IF NOT EXISTS activities (
                activity_id SERIAL PRIMARY KEY,
                title VARCHAR(100) NOT NULL,
                description TEXT,
                start_date TIMESTAMP NOT NULL,
                end_date TIMESTAMP NOT NULL,
                location VARCHAR(100),
                difficulty_level VARCHAR(20),
                max_participants INTEGER,
                created_by INTEGER REFERENCES users(user_id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Activities table created successfully');

        // Activity participants table
        await db.query(`
            CREATE TABLE IF NOT EXISTS activity_participants (
                participation_id SERIAL PRIMARY KEY,
                activity_id INTEGER REFERENCES activities(activity_id),
                member_id INTEGER REFERENCES members(member_id),
                hours_spent DECIMAL(5,2) NOT NULL,
                role VARCHAR(50),
                notes TEXT,
                verified_by INTEGER REFERENCES users(user_id),
                verified_at TIMESTAMP
            );
        `);
        console.log('Activity participants table created successfully');

        // Annual statistics table
        await db.query(`
            CREATE TABLE IF NOT EXISTS annual_statistics (
                stat_id SERIAL PRIMARY KEY,
                member_id INTEGER REFERENCES members(member_id),
                year INTEGER NOT NULL,
                total_hours DECIMAL(7,2) NOT NULL,
                total_activities INTEGER NOT NULL,
                membership_status VARCHAR(20) NOT NULL,
                calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Annual statistics table created successfully');

        // Create indexes for better performance
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_activity_participants_member 
            ON activity_participants(member_id);
            
            CREATE INDEX IF NOT EXISTS idx_activity_participants_activity 
            ON activity_participants(activity_id);
            
            CREATE INDEX IF NOT EXISTS idx_annual_statistics_member_year 
            ON annual_statistics(member_id, year);
        `);
        console.log('Indexes created successfully');

        // Commit transaction
        await db.query('COMMIT');
        
        console.log('Database setup completed successfully');
        isInitialized = true;

    } catch (error) {
        // Rollback transaction on error
        await db.query('ROLLBACK');
        console.error('Error setting up database:', error);
        throw error;
    }
}

export { setupDatabase };