// src/setupDatabase.ts
import db from "./utils/db.js";
import fs from 'fs/promises';

let isInitialized = false;

interface TableCheck {
  exists: boolean;
}

async function checkTablesExist(): Promise<boolean> {
  const tables = ["members", "activities", "user_activities"];
  for (const table of tables) {
    const result = await db.query(
      `
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = $1
            )
        `,
      [table]
    );

    if (!result.rows[0].exists) {
      return false;
    }
  }

  return true;
}

export async function setupDatabase(): Promise<void> {
  // Prevent multiple initializations
  if (isInitialized) {
    console.log("Database already initialized, skipping setup");
    return;
  }

  try {
    const tablesExist = await checkTablesExist();

    if (tablesExist) {
      console.log("All tables already exist, skipping creation");
      isInitialized = true;
      return;
    }

    // Begin transaction
    await db.query("BEGIN");

    // Members table
    await db.query(`
            CREATE TABLE IF NOT EXISTS members (
        member_id SERIAL PRIMARY KEY,
        status character varying(50) DEFAULT 'pending',
        date_of_birth date,
        oib character varying(11) NOT NULL,
        cell_phone character varying(20) NOT NULL,
        city character varying(100) NOT NULL,
        street_address character varying(200) NOT NULL,
        email character varying(255),
        first_name character varying(100) NOT NULL,
        last_name character varying(100) NOT NULL,
        life_status character varying(25),
        role character varying(20) DEFAULT 'member' NOT NULL,
        total_hours numeric(10,2) DEFAULT 0,
        full_name character varying(100) GENERATED ALWAYS AS ((((first_name)::text || ' '::text) || (last_name)::text)) STORED,
        tshirt_size character varying(4),
        shell_jacket_size character varying(4),
        CONSTRAINT life_status_check CHECK (life_status IN ('employed/unemployed', 'child/pupil/student', 'pensioner')),
        CONSTRAINT members_role_check CHECK (role IN ('member', 'admin', 'superuser'))
    );
        `);
    console.log("✅ Activity participants table created successfully");

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
    console.log("✅ Activity types table created successfully");

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
    console.log("✅ Activities table created successfully");

    // Audit logs table
    await db.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                log_id SERIAL PRIMARY KEY,
                action_type VARCHAR(50) NOT NULL,
                performed_by INTEGER REFERENCES members(member_id),
                action_details TEXT NOT NULL,
                ip_address VARCHAR(45),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status VARCHAR(20),
                affected_member INTEGER REFERENCES members(member_id)
            );
        `);

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
    console.log("✅ Annual statistics table created successfully");

    // Create indexes
    await db.query(`
            CREATE INDEX IF NOT EXISTS idx_activities_type 
            ON activities(activity_type_id);
            
            CREATE INDEX IF NOT EXISTS idx_activity_participants_activity 
            ON activity_participants(activity_id);
            
            CREATE INDEX IF NOT EXISTS idx_activity_participants_member 
            ON activity_participants(member_id);
        `);
    console.log("✅ Indexes created successfully");

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
    console.log("✅ Default activity types created successfully");

    // Add image_profile column to members table
    await db.query(`
    ALTER TABLE members 
    ADD COLUMN IF NOT EXISTS profile_image_path VARCHAR(255),
    ADD COLUMN IF NOT EXISTS profile_image_updated_at TIMESTAMP
`);

    // Create directory for image storage if it doesn't exist
    await fs.mkdir("uploads/profile_images", { recursive: true });

    // Commit transaction
    await db.query("COMMIT");

    console.log("✅ Database setup completed successfully");
    isInitialized = true;
  } catch (error) {
    // Rollback transaction on error
    await db.query("ROLLBACK");
    console.error("❌ Error setting up database:", error);
    throw error;
  }
}
