import db from './utils/db.js';

let isInitialized = false;

async function checkTablesExist() {
    const tables = [
        'users', 
        'roles', 
        'user_roles', 
        'members', 
        'activities', 
        'activity_types',
        'activity_participants', 
        'annual_statistics'
    ];
    
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
                id serial NOT NULL,
                username character varying(50) NOT NULL,
                email character varying(255) NOT NULL,
                password character varying(255) NOT NULL,
                role character varying(20) NOT NULL DEFAULT 'member',
                created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT users_pkey PRIMARY KEY (id),
                CONSTRAINT users_email_key UNIQUE (email),
                CONSTRAINT users_username_key UNIQUE (username)
            );
        `);
        console.log('Users table created successfully');

        // Roles table
        await db.query(`
            CREATE TABLE IF NOT EXISTS roles (
                role_id serial NOT NULL,
                role_name character varying(50) NOT NULL,
                description text,
                created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
                updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT roles_pkey PRIMARY KEY (role_id),
                CONSTRAINT roles_role_name_key UNIQUE (role_name)
            );
        `);
        console.log('Roles table created successfully');

        // User roles table
        await db.query(`
            CREATE TABLE IF NOT EXISTS user_roles (
                id serial NOT NULL,
                user_id integer,
                role_name character varying(50) NOT NULL,
                granted_by integer,
                created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT user_roles_pkey PRIMARY KEY (id),
                CONSTRAINT user_roles_user_id_role_name_key UNIQUE (user_id, role_name),
                CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id)
                    REFERENCES users (id),
                CONSTRAINT user_roles_granted_by_fkey FOREIGN KEY (granted_by)
                    REFERENCES users (id)
            );
        `);
        console.log('User roles table created successfully');

        // Members table
        await db.query(`
            CREATE TABLE IF NOT EXISTS members (
                member_id serial NOT NULL,
                user_id integer,
                first_name character varying(50) NOT NULL,
                last_name character varying(50) NOT NULL,
                join_date date NOT NULL,
                status character varying(20) DEFAULT 'active',
                phone character varying(20),
                emergency_contact character varying(100),
                membership_type character varying(20) DEFAULT 'passive',
                notes text,
                CONSTRAINT members_pkey PRIMARY KEY (member_id)
            );
        `);
        console.log('Members table created successfully');

        // Activity types table
        await db.query(`
            CREATE TABLE IF NOT EXISTS activity_types (
                type_id serial NOT NULL,
                name character varying(50) NOT NULL,
                description text,
                created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT activity_types_pkey PRIMARY KEY (type_id),
                CONSTRAINT activity_types_name_key UNIQUE (name)
            );
        `);
        console.log('Activity types table created successfully');

        // Activities table
        await db.query(`
            CREATE TABLE IF NOT EXISTS activities (
                activity_id serial NOT NULL,
                title character varying(100) NOT NULL,
                description text,
                start_date timestamp without time zone NOT NULL,
                end_date timestamp without time zone NOT NULL,
                location character varying(100),
                difficulty_level character varying(20),
                max_participants integer,
                created_by integer,
                created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
                activity_type_id integer,
                CONSTRAINT activities_pkey PRIMARY KEY (activity_id),
                CONSTRAINT activities_activity_type_id_fkey FOREIGN KEY (activity_type_id)
                    REFERENCES activity_types (type_id)
            );
        `);
        console.log('Activities table created successfully');

        // Activity participants table
        await db.query(`
            CREATE TABLE IF NOT EXISTS activity_participants (
                participation_id serial NOT NULL,
                activity_id integer,
                member_id integer,
                hours_spent numeric(5,2) NOT NULL,
                role character varying(50),
                notes text,
                verified_by integer,
                verified_at timestamp without time zone,
                CONSTRAINT activity_participants_pkey PRIMARY KEY (participation_id),
                CONSTRAINT activity_participants_activity_id_fkey FOREIGN KEY (activity_id)
                    REFERENCES activities (activity_id),
                CONSTRAINT activity_participants_member_id_fkey FOREIGN KEY (member_id)
                    REFERENCES members (member_id)
            );
        `);
        console.log('Activity participants table created successfully');

        // Annual statistics table
        await db.query(`
            CREATE TABLE IF NOT EXISTS annual_statistics (
                stat_id serial NOT NULL,
                member_id integer,
                year integer NOT NULL,
                total_hours numeric(7,2) NOT NULL,
                total_activities integer NOT NULL,
                membership_status character varying(20) NOT NULL,
                calculated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT annual_statistics_pkey PRIMARY KEY (stat_id),
                CONSTRAINT unique_member_year UNIQUE (member_id, year),
                CONSTRAINT annual_statistics_member_id_fkey FOREIGN KEY (member_id)
                    REFERENCES members (member_id)
            );
        `);
        console.log('Annual statistics table created successfully');

        // Create indexes
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_activities_type 
            ON activities(activity_type_id);
            
            CREATE INDEX IF NOT EXISTS idx_activity_participants_activity 
            ON activity_participants(activity_id);
            
            CREATE INDEX IF NOT EXISTS idx_activity_participants_member 
            ON activity_participants(member_id);
        `);
        console.log('Indexes created successfully');

        // Insert default roles
        await db.query(`
            INSERT INTO roles (role_name, description)
            VALUES 
                ('member', 'Regular member with basic access'),
                ('administrator', 'Administrator with full system access'),
                ('super_user', 'Super user with complete system control')
            ON CONFLICT (role_name) DO NOTHING;
        `);
        console.log('Default roles created successfully');

        // Insert default activity types
        await db.query(`
            INSERT INTO activity_types (name, description)
            VALUES 
                ('hiking', 'Mountain hiking activities'),
                ('climbing', 'Rock climbing activities'),
                ('training', 'Training and educational activities'),
                ('maintenance', 'Trail and equipment maintenance'),
                ('social', 'Social gatherings and meetings')
            ON CONFLICT (name) DO NOTHING;
        `);
        console.log('Default activity types created successfully');

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