// src/setupDatabase.ts
import db from "./utils/db.js";
import fs from "fs/promises";

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
    console.log("✅ Members table created successfully");

    // Note: The 'card_number' column in members table is deprecated.
    // All card numbers should be stored in and read from membership_details.card_number.
    // This column is maintained only for backward compatibility and should be removed in a future migration.

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

    // Stamp inventory management table
    await db.query(`
      CREATE TABLE IF NOT EXISTS stamp_inventory (
          id SERIAL PRIMARY KEY,
          stamp_type VARCHAR(20) NOT NULL,
          initial_count INTEGER NOT NULL DEFAULT 0,
          issued_count INTEGER DEFAULT 0,
          remaining INTEGER GENERATED ALWAYS AS (initial_count - issued_count) STORED,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT stamp_type_check CHECK (stamp_type IN ('employed', 'student', 'pensioner')),
          CONSTRAINT stamp_type_unique UNIQUE (stamp_type)
      );

      -- Ensure initial data exists
      INSERT INTO stamp_inventory (stamp_type, initial_count, issued_count) 
      VALUES 
          ('employed', 0, 0),
          ('student', 0, 0),
          ('pensioner', 0, 0)
      ON CONFLICT (stamp_type) DO NOTHING;
  `);
    console.log("✅ Stamp inventory table created successfully");
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

    // Activity participants table
    await db.query(`
            CREATE TABLE IF NOT EXISTS activity_participants (
                participant_id serial NOT NULL,
                activity_id integer NOT NULL,
                member_id integer NOT NULL,
                joined_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT activity_participants_pkey PRIMARY KEY (participant_id),
                CONSTRAINT activity_participants_activity_id_fkey FOREIGN KEY (activity_id)
                    REFERENCES activities (activity_id),
                CONSTRAINT activity_participants_member_id_fkey FOREIGN KEY (member_id)
                    REFERENCES members (member_id)
            );
        `);
    console.log("✅ Activity participants table created successfully");

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
    console.log("✅ Audit logs table created successfully");

    //System settings table
    await db.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
          id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
          card_number_length INTEGER DEFAULT 5,
          renewal_start_day INTEGER DEFAULT 1,
          renewal_start_month INTEGER DEFAULT 11,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_by VARCHAR(255) DEFAULT 'system'
      );
  
      -- Insert default settings if they don't exist
      INSERT INTO system_settings (id) 
      VALUES ('default')
      ON CONFLICT (id) DO NOTHING;
  `);
  console.log("✅ System settings table created successfully");

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

    await db.query(`
      CREATE TABLE IF NOT EXISTS member_messages (
          message_id SERIAL PRIMARY KEY,
          member_id INTEGER REFERENCES members(member_id),
          message_text TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          read_at TIMESTAMP,
          status VARCHAR(20) DEFAULT 'unread',
          CONSTRAINT status_values CHECK (status IN ('unread', 'read', 'archived'))
      );
  `);
    console.log("✅ Member messages table created successfully");

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
    ADD COLUMN IF NOT EXISTS profile_image_path VARCHAR(255);
  `);

    await db.query(`
    ALTER TABLE members 
    ADD COLUMN IF NOT EXISTS profile_image_updated_at TIMESTAMP;
  `);

    await db.query(`
    ALTER TABLE members 
    ADD COLUMN IF NOT EXISTS membership_type VARCHAR(20) DEFAULT 'regular' CHECK (membership_type IN ('regular', 'supporting', 'honorary'));
  `);

    await db.query(`
    ALTER TABLE members 
    ADD COLUMN IF NOT EXISTS date_of_birth DATE;
  `);

    // Add admin_permissions table right before the COMMIT
    await db.query(`
      CREATE TABLE IF NOT EXISTS admin_permissions (
        permission_id SERIAL PRIMARY KEY,
        member_id INTEGER REFERENCES members(member_id),
        can_manage_end_reasons BOOLEAN DEFAULT false,
        granted_by INTEGER REFERENCES members(member_id),
        granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(member_id)
      );
    `);
    console.log("✅ Admin permissions table created successfully");

    // Create indexes for admin_permissions
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_admin_permissions_member 
      ON admin_permissions(member_id);
      
      CREATE INDEX IF NOT EXISTS idx_admin_permissions_granted_by 
      ON admin_permissions(granted_by);
    `);
    console.log("✅ Admin permissions indexes created successfully");

    // Kreiranje tablice stamp_history za arhiviranje podataka o markicama po godinama
    await db.query(`
      CREATE TABLE IF NOT EXISTS stamp_history (
        id SERIAL PRIMARY KEY,
        year INT NOT NULL,
        stamp_type VARCHAR(50) NOT NULL,
        initial_count INT NOT NULL,
        issued_count INT NOT NULL,
        reset_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        reset_by INT REFERENCES members(member_id),
        notes TEXT
      );
    `);
    console.log('✅ Tablica stamp_history kreirana ili već postoji');

    // Password sync trigger system
    console.log("Setting up password-card number synchronization...");
    await db.query(`
      -- Create notification table for password updates
      CREATE TABLE IF NOT EXISTS password_update_queue (
          queue_id SERIAL PRIMARY KEY,
          member_id INT NOT NULL,
          card_number VARCHAR(20) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          processed BOOLEAN DEFAULT FALSE,
          FOREIGN KEY (member_id) REFERENCES members(member_id)
      );

      -- Create trigger function
      CREATE OR REPLACE FUNCTION notify_card_number_change()
      RETURNS TRIGGER AS $$
      BEGIN
          -- If card_number was changed
          IF (TG_OP = 'UPDATE' AND OLD.card_number IS DISTINCT FROM NEW.card_number) OR 
             (TG_OP = 'INSERT' AND NEW.card_number IS NOT NULL) THEN
              
              -- Insert into queue for password update
              INSERT INTO password_update_queue (member_id, card_number) 
              VALUES (NEW.member_id, NEW.card_number);
              
              -- Add a log to the audit_logs table if it exists
              BEGIN
                  INSERT INTO audit_logs (action_type, performed_by, action_details, ip_address, status, affected_member)
                  VALUES ('CARD_NUMBER_UPDATED', NULL, format('Card number updated for member ID %s, needs password update', NEW.member_id), 
                         'Trigger', 'notification', NEW.member_id);
              EXCEPTION WHEN OTHERS THEN
                  -- If audit table doesn't exist or insertion fails, continue anyway
              END;
          END IF;
          
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Attach the trigger to the membership_details table
      DROP TRIGGER IF EXISTS trigger_card_number_change ON membership_details;
      CREATE TRIGGER trigger_card_number_change
      AFTER INSERT OR UPDATE ON membership_details
      FOR EACH ROW
      EXECUTE FUNCTION notify_card_number_change();
    `);
    console.log("✅ Password synchronization trigger system created");

    // Add card_numbers table
    await db.query(`
      CREATE TABLE IF NOT EXISTS card_numbers (
        id SERIAL PRIMARY KEY,
        card_number VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'available',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        assigned_at TIMESTAMP WITH TIME ZONE,
        member_id INTEGER,
        CONSTRAINT card_number_unique UNIQUE (card_number),
        CONSTRAINT status_check CHECK (status IN ('available', 'assigned', 'retired')),
        CONSTRAINT member_fk FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_card_numbers_status ON card_numbers(status);
      CREATE INDEX IF NOT EXISTS idx_card_numbers_member_id ON card_numbers(member_id);
    `);
    console.log("✅ Card numbers table created successfully");

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
