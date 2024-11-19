-- src/migrations/update_member_auth.sql

-- Add password_hash
ALTER TABLE members 
    ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Add full_name computed column
ALTER TABLE members 
    ADD COLUMN IF NOT EXISTS full_name VARCHAR(100) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED;

-- Add life_status
ALTER TABLE members 
    ADD COLUMN IF NOT EXISTS life_status VARCHAR(25);

-- Update life_status constraint
ALTER TABLE members 
    DROP CONSTRAINT IF EXISTS life_status_check;
    
ALTER TABLE members 
    ADD CONSTRAINT life_status_check 
    CHECK (life_status IN ('employed/unemployed', 'child/pupil/student', 'pensioner'));

-- Create index
CREATE INDEX IF NOT EXISTS idx_members_full_name ON members(full_name);